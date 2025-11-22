import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { Like, LikeDocument } from './schemas/like.schema';
import { Match, MatchDocument } from './schemas/match.schema';
import { Pass, PassDocument } from './schemas/pass.schema';
import { NotificationService } from '../achievements/services/notification.service';
import { NotificationType } from '../achievements/schemas/notification.schema';

@Injectable()
export class QuickMatchService {
  private readonly logger = new Logger(QuickMatchService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Pass.name) private passModel: Model<PassDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Récupère les profils compatibles avec l'utilisateur connecté
   *
   * LOGIQUE DE FILTRAGE :
   * 1. Récupère les sportsInterests de l'utilisateur connecté
   * 2. Récupère les activités créées par l'utilisateur
   * 3. Combine : sportsInterests + sports des activités = liste complète des sports
   * 4. Filtre les autres utilisateurs qui ont AU MOINS UN sport en commun
   * 5. Exclut les profils déjà likés, passés ou matchés
   *
   * @param userId ID de l'utilisateur connecté
   * @param page Numéro de page (défaut: 1)
   * @param limit Nombre de résultats par page (défaut: 20)
   */
  async getCompatibleProfiles(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ profiles: any[]; total: number; page: number; totalPages: number }> {
    // 1. Récupérer l'utilisateur connecté
    const currentUser = await this.userModel.findById(userId).exec();
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // 2. Récupérer les sportsInterests de l'utilisateur
    const userSportsInterests = currentUser.sportsInterests || [];
    this.logger.log(
      `[QuickMatch] User ${userId} sportsInterests: ${JSON.stringify(userSportsInterests)}`,
    );

    // 3. Récupérer les activités créées par l'utilisateur
    const userActivities = await this.activityModel
      .find({ creator: new Types.ObjectId(userId) })
      .exec();

    // 4. Extraire les sports des activités de l'utilisateur
    const activitySports = userActivities
      .map((activity) => activity.sportType)
      .filter(Boolean); // Filtrer les valeurs vides

    this.logger.log(
      `[QuickMatch] User ${userId} activities count: ${userActivities.length}, activitySports: ${JSON.stringify(activitySports)}`,
    );

    // 5. Combiner sportsInterests + sports des activités (sans doublons)
    const allUserSports = [
      ...new Set([...userSportsInterests, ...activitySports]),
    ].filter(Boolean);

    this.logger.log(
      `[QuickMatch] User ${userId} allUserSports: ${JSON.stringify(allUserSports)}`,
    );

    // Si l'utilisateur n'a aucun sport, retourner tous les utilisateurs (fallback)
    if (allUserSports.length === 0) {
      this.logger.warn(
        `[QuickMatch] User ${userId} has no sports interests or activities. Returning all users as fallback.`,
      );
      
      // Construire une requête sans filtre de sport (fallback)
      const fallbackQuery: any = {
        _id: { $ne: new Types.ObjectId(userId) },
      };

      const fallbackTotal = await this.userModel.countDocuments(fallbackQuery).exec();
      const skip = (page - 1) * limit;
      const fallbackUsers = await this.userModel
        .find(fallbackQuery)
        .skip(skip)
        .limit(limit)
        .exec();

      // Enrichir avec les données supplémentaires
      const enrichedFallbackProfiles = await Promise.all(
        fallbackUsers.map(async (user) => {
          const activitiesCount = await this.activityModel.countDocuments({
            creator: user._id,
          }).exec();
          const distance = this.calculateDistance(currentUser, user);
          return {
            ...user.toObject(),
            activitiesCount,
            distance: distance !== null ? `${distance.toFixed(1)} km` : null,
          };
        }),
      );

      const totalPages = Math.ceil(fallbackTotal / limit);
      
      this.logger.log(
        `[QuickMatch] User ${userId} - Fallback profiles returned: ${enrichedFallbackProfiles.length}`,
      );

      return {
        profiles: enrichedFallbackProfiles,
        total: fallbackTotal,
        page,
        totalPages,
      };
    }

    // 6. Récupérer les IDs des profils à exclure
    const [likedProfiles, passedProfiles, matchedProfiles] = await Promise.all([
      this.likeModel
        .find({ fromUser: new Types.ObjectId(userId) })
        .select('toUser')
        .exec(),
      this.passModel
        .find({ fromUser: new Types.ObjectId(userId) })
        .select('toUser')
        .exec(),
      this.matchModel
        .find({
          $or: [
            { user1: new Types.ObjectId(userId) },
            { user2: new Types.ObjectId(userId) },
          ],
        })
        .select('user1 user2')
        .exec(),
    ]);

    const likedUserIds = new Set(likedProfiles.map((like) => like.toUser.toString()));
    const passedUserIds = new Set(passedProfiles.map((pass) => pass.toUser.toString()));
    const matchedUserIds = new Set(
      matchedProfiles.map((match) =>
        match.user1.toString() === userId
          ? match.user2.toString()
          : match.user1.toString(),
      ),
    );

    this.logger.log(
      `[QuickMatch] User ${userId} - Excluded: liked=${likedUserIds.size}, passed=${passedUserIds.size}, matched=${matchedUserIds.size}`,
    );

    // 7. FILTRAGE PROGRESSIF INTELLIGENT - Garantir 100% de résultats sans retourner les likés
    let finalProfiles: any[] = [];
    let finalTotal = 0;
    let strategyUsed = '';

    // STRATÉGIE 1 : Filtrage strict (sports communs exacts + exclure likés/passés/matchés)
    const strictExcludedIds = [
      new Types.ObjectId(userId),
      ...Array.from(likedUserIds).map((id) => new Types.ObjectId(id)),
      ...Array.from(passedUserIds).map((id) => new Types.ObjectId(id)),
      ...Array.from(matchedUserIds).map((id) => new Types.ObjectId(id)),
    ];

    const strictQuery: any = {
      _id: { $nin: strictExcludedIds },
    };

    if (allUserSports.length > 0) {
      strictQuery.sportsInterests = {
        $in: allUserSports.map((sport) => new RegExp(`^${sport}$`, 'i')),
      };
    }

    const strictTotal = await this.userModel.countDocuments(strictQuery).exec();

    if (strictTotal >= 3) {
      // Assez de profils avec filtrage strict
      this.logger.log(
        `[QuickMatch] ✅ Strategy 1 (strict): ${strictTotal} profiles found - SUFFICIENT`,
      );
      strategyUsed = 'strict';

      const skip = (page - 1) * limit;
      const strictUsers = await this.userModel
        .find(strictQuery)
        .skip(skip)
        .limit(limit)
        .exec();

      finalProfiles = strictUsers.filter((user) => {
        const userIdStr = user._id.toString();
        // ✅ GARANTIE : Exclure les likés/matchés même si la query les inclut
        if (likedUserIds.has(userIdStr) || matchedUserIds.has(userIdStr)) {
          return false;
        }
        // Vérifier les sports communs
        const userSports = user.sportsInterests || [];
        return allUserSports.some((sport) =>
          userSports.some(
            (userSport) =>
              userSport.toLowerCase().trim() === sport.toLowerCase().trim(),
          ),
        );
      });

      // ✅ CORRECTION : Mettre à jour finalTotal APRÈS le filtrage JavaScript
      finalTotal = finalProfiles.length;
      this.logger.log(
        `[QuickMatch] Strategy 1 - After JS filter: ${finalProfiles.length} profiles (from ${strictUsers.length} retrieved)`,
      );
    } else {
      // STRATÉGIE 2 : Recherche flexible de sports (exclure likés/passés/matchés)
      this.logger.log(
        `[QuickMatch] ⚠️ Strategy 1 insufficient (${strictTotal} profiles). Trying Strategy 2 (flexible sports, exclude liked/passed/matched)...`,
      );

      const flexibleExcludedIds = [
        new Types.ObjectId(userId),
        ...Array.from(likedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les likés
        ...Array.from(passedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les passés
        ...Array.from(matchedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les matchés
      ];

      const flexibleQuery: any = {
        _id: { $nin: flexibleExcludedIds },
      };

      // Recherche flexible : sports partiels ou similaires
      if (allUserSports.length > 0) {
        flexibleQuery.$or = allUserSports.map((sport) => ({
          sportsInterests: {
            $in: [
              new RegExp(sport, 'i'), // Recherche partielle
              new RegExp(`^${sport}`, 'i'), // Commence par
              new RegExp(`${sport}$`, 'i'), // Termine par
            ],
          },
        }));
      }

      const flexibleTotal = await this.userModel.countDocuments(flexibleQuery).exec();

      if (flexibleTotal >= 3) {
        this.logger.log(
          `[QuickMatch] ✅ Strategy 2 (flexible sports): ${flexibleTotal} profiles found - SUFFICIENT`,
        );
        strategyUsed = 'flexible-sports';

        const skip = (page - 1) * limit;
        const flexibleUsers = await this.userModel
          .find(flexibleQuery)
          .skip(skip)
          .limit(limit)
          .exec();

        // Filtrer JavaScript pour s'assurer qu'on n'inclut pas les likés/passés/matchés
        finalProfiles = flexibleUsers.filter((user) => {
          const userIdStr = user._id.toString();
          // ✅ Exclure les likés/passés/matchés même si la query les inclut
          if (likedUserIds.has(userIdStr) || passedUserIds.has(userIdStr) || matchedUserIds.has(userIdStr)) {
            return false;
          }
          return true;
        });

        // ✅ CORRECTION : Mettre à jour finalTotal APRÈS le filtrage JavaScript
        finalTotal = finalProfiles.length;
        this.logger.log(
          `[QuickMatch] Strategy 2 - After JS filter: ${finalProfiles.length} profiles (from ${flexibleUsers.length} retrieved)`,
        );
      } else {
        // STRATÉGIE 3 : Sans filtre de sport (mais toujours exclure likés/passés/matchés)
        this.logger.log(
          `[QuickMatch] ⚠️ Strategy 2 insufficient (${flexibleTotal} profiles). Trying Strategy 3 (no sport filter, exclude liked/passed/matched)...`,
        );

        const noSportExcludedIds = [
          new Types.ObjectId(userId),
          ...Array.from(likedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les likés
          ...Array.from(passedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les passés
          ...Array.from(matchedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les matchés
        ];

        const noSportQuery: any = {
          _id: { $nin: noSportExcludedIds },
        };

        const noSportTotal = await this.userModel.countDocuments(noSportQuery).exec();

        if (noSportTotal >= 3) {
          this.logger.log(
            `[QuickMatch] ✅ Strategy 3 (no sport filter): ${noSportTotal} profiles found - SUFFICIENT`,
          );
          strategyUsed = 'no-sport-filter';

          const skip = (page - 1) * limit;
          const noSportUsers = await this.userModel
            .find(noSportQuery)
            .skip(skip)
            .limit(limit)
            .exec();

          // Filtrer JavaScript pour s'assurer qu'on n'inclut pas les likés/passés/matchés
          finalProfiles = noSportUsers.filter((user) => {
            const userIdStr = user._id.toString();
            if (likedUserIds.has(userIdStr) || passedUserIds.has(userIdStr) || matchedUserIds.has(userIdStr)) {
              return false;
            }
            return true;
          });

          // ✅ CORRECTION : Mettre à jour finalTotal APRÈS le filtrage JavaScript
          finalTotal = finalProfiles.length;
          this.logger.log(
            `[QuickMatch] Strategy 3 - After JS filter: ${finalProfiles.length} profiles (from ${noSportUsers.length} retrieved)`,
          );
        } else {
          // STRATÉGIE 4 : Dernier recours - Tous sauf likés/passés/matchés
          this.logger.warn(
            `[QuickMatch] ⚠️ Strategy 3 insufficient (${noSportTotal} profiles). Using Strategy 4 (ALL except liked/passed/matched)...`,
          );

          const finalExcludedIds = [
            new Types.ObjectId(userId),
            ...Array.from(likedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les likés
            ...Array.from(passedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les passés
            ...Array.from(matchedUserIds).map((id) => new Types.ObjectId(id)), // ✅ TOUJOURS exclure les matchés
          ];

          const finalQuery: any = {
            _id: { $nin: finalExcludedIds },
          };

          finalTotal = await this.userModel.countDocuments(finalQuery).exec();

          const skip = (page - 1) * limit;
          const allUsers = await this.userModel
            .find(finalQuery)
            .skip(skip)
            .limit(limit)
            .exec();

          // Filtrer JavaScript pour garantir qu'on n'inclut JAMAIS les likés/passés/matchés
          finalProfiles = allUsers.filter((user) => {
            const userIdStr = user._id.toString();
            // ✅ JAMAIS retourner les likés, passés ou matchés
            if (likedUserIds.has(userIdStr) || passedUserIds.has(userIdStr) || matchedUserIds.has(userIdStr)) {
              return false;
            }
            return true;
          });

          strategyUsed = 'all-except-liked-passed-matched';
          finalTotal = finalProfiles.length; // Ajuster le total après filtrage
        }
      }
    }

    this.logger.log(
      `[QuickMatch] User ${userId} - Final strategy: "${strategyUsed}", profiles found: ${finalProfiles.length}, total: ${finalTotal}`,
    );

    // 8. FILTRAGE FINAL GARANTI - Exclure TOUJOURS les profils likés/passés/matchés
    const filteredFinalProfiles = finalProfiles.filter((user) => {
      const userIdStr = user._id.toString();
      // ✅ GARANTIE : JAMAIS retourner les profils likés, passés ou matchés
      if (likedUserIds.has(userIdStr)) {
        this.logger.warn(
          `[QuickMatch] ⚠️ Filtered out liked profile: ${userIdStr} (should not have been returned)`,
        );
        return false;
      }
      if (passedUserIds.has(userIdStr)) {
        this.logger.warn(
          `[QuickMatch] ⚠️ Filtered out passed profile: ${userIdStr} (should not have been returned)`,
        );
        return false;
      }
      if (matchedUserIds.has(userIdStr)) {
        this.logger.warn(
          `[QuickMatch] ⚠️ Filtered out matched profile: ${userIdStr} (should not have been returned)`,
        );
        return false;
      }
      return true;
    });

    this.logger.log(
      `[QuickMatch] User ${userId} - After final filter: ${filteredFinalProfiles.length} profiles (removed ${finalProfiles.length - filteredFinalProfiles.length} liked/passed/matched)`,
    );

    // 9. Enrichir et trier les profils finaux
    const enrichedProfiles = await Promise.all(
      filteredFinalProfiles.map(async (user) => {
        const activitiesCount = await this.activityModel.countDocuments({
          creator: user._id,
        }).exec();
        const distance = this.calculateDistance(currentUser, user);
        return {
          ...user.toObject(),
          activitiesCount,
          distance: distance !== null ? `${distance.toFixed(1)} km` : null,
        };
      }),
    );

    // 10. Trier par pertinence (prioriser les sports communs)
    const sortedProfiles = this.sortByRelevance(enrichedProfiles, allUserSports);

    // 11. Calculer la pagination (basée sur le nombre réel de profils retournés)
    const actualTotal = sortedProfiles.length;
    const totalPages = Math.ceil(actualTotal / limit);

    this.logger.log(
      `[QuickMatch] ✅ User ${userId} - Strategy "${strategyUsed}": ${actualTotal} profiles returned (after filtering liked/passed/matched)`,
    );

    // 12. Si aucun profil après filtrage, retourner une liste vide
    // ✅ Les profils likés/passés/matchés ne doivent JAMAIS réapparaître
    if (actualTotal === 0) {
      this.logger.warn(
        `[QuickMatch] ⚠️ No profiles available after filtering. All profiles were liked/passed/matched.`,
      );
    }

    return {
      profiles: sortedProfiles,
      total: actualTotal, // Utiliser le nombre réel de profils retournés
      page,
      totalPages: Math.max(1, totalPages), // Au moins 1 page
    };
  }

  /**
   * Calcule la distance entre deux utilisateurs en utilisant la formule de Haversine
   * Retourne la distance en kilomètres
   */
  private calculateDistance(
    user1: UserDocument,
    user2: UserDocument,
  ): number | null {
    // Vérifier si les deux utilisateurs ont des coordonnées GPS
    if (
      !user1.latitude ||
      !user1.longitude ||
      !user2.latitude ||
      !user2.longitude
    ) {
      return null;
    }

    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = this.toRadians(user2.latitude - user1.latitude);
    const dLon = this.toRadians(user2.longitude - user1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(user1.latitude)) *
        Math.cos(this.toRadians(user2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convertit des degrés en radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Trie les profils par pertinence
   */
  private sortByRelevance(profiles: any[], userSports: string[]): any[] {
    return profiles.sort((a, b) => {
      // Calculer le score de pertinence pour chaque profil
      const scoreA = this.calculateRelevanceScore(a, userSports);
      const scoreB = this.calculateRelevanceScore(b, userSports);

      return scoreB - scoreA; // Tri décroissant
    });
  }

  /**
   * Calcule un score de pertinence basé sur :
   * - Nombre de sports en commun (poids: 10)
   * - Nombre d'activités (poids: 1)
   * - Distance (poids: 5 max)
   */
  private calculateRelevanceScore(profile: any, userSports: string[]): number {
    const profileSports = profile.sportsInterests || [];

    // Compter les sports en commun (case-insensitive)
    const commonSports = userSports.filter((sport) =>
      profileSports.some(
        (ps) => ps.toLowerCase().trim() === sport.toLowerCase().trim(),
      ),
    ).length;

    // Score basé sur les sports en commun (poids: 10)
    let score = commonSports * 10;

    // Bonus pour le nombre d'activités (poids: 1)
    score += (profile.activitiesCount || 0) * 1;

    // Bonus pour la distance (plus proche = meilleur score)
    if (profile.distance) {
      const distanceKm = parseFloat(profile.distance.replace(' km', ''));
      if (distanceKm !== null && !isNaN(distanceKm)) {
        // Plus la distance est petite, plus le score est élevé
        // Max 5 points bonus pour distance < 1km
        const distanceBonus = Math.max(0, 5 - distanceKm);
        score += distanceBonus;
      }
    }

    return score;
  }

  /**
   * Enregistre un like d'un utilisateur vers un profil
   * Vérifie si c'est un match mutuel et crée un Match si nécessaire
   */
  async likeProfile(userId: string, profileId: string): Promise<{ isMatch: boolean }> {
    // Vérifier que les utilisateurs existent
    const user = await this.userModel.findById(userId).exec();
    const profile = await this.userModel.findById(profileId).exec();

    if (!user || !profile) {
      throw new NotFoundException('User or profile not found');
    }

    // Vérifier si le like existe déjà
    const existingLike = await this.likeModel
      .findOne({
        fromUser: new Types.ObjectId(userId),
        toUser: new Types.ObjectId(profileId),
      })
      .exec();

    if (existingLike) {
      throw new ConflictException('Profile already liked');
    }

    // Vérifier si l'utilisateur a déjà passé ce profil
    const existingPass = await this.passModel
      .findOne({
        fromUser: new Types.ObjectId(userId),
        toUser: new Types.ObjectId(profileId),
      })
      .exec();

    if (existingPass) {
      throw new ConflictException('Cannot like a profile that was passed');
    }

    // Vérifier si c'est un match mutuel (l'autre utilisateur a déjà liké)
    const reverseLike = await this.likeModel
      .findOne({
        fromUser: new Types.ObjectId(profileId),
        toUser: new Types.ObjectId(userId),
      })
      .exec();

    const isMatch = !!reverseLike;

    // Créer le like
    const like = new this.likeModel({
      fromUser: new Types.ObjectId(userId),
      toUser: new Types.ObjectId(profileId),
      isMatch,
    });
    await like.save();

    // Créer une notification pour l'utilisateur qui a été liké
    try {
      this.logger.log(
        `[QuickMatch] Creating like notification: ${user.name} liked ${profile.name}'s profile`,
      );

      await this.notificationService.createNotification(
        profileId, // L'utilisateur qui a été liké
        NotificationType.LIKE_RECEIVED,
        isMatch ? '🎉 Nouveau Match !' : '💕 Nouveau Like !',
        isMatch
          ? `${user.name} a liké votre profil - C'est un match ! 🎉`
          : `${user.name} a liké votre profil`,
        {
          likedBy: userId,
          likedByName: user.name || user.email,
          likedByAvatar: user.profileImageUrl || user.profileImageThumbnailUrl,
          isMatch: isMatch,
        },
      );

      this.logger.log(
        `[QuickMatch] ✅ Like notification created for user ${profileId}`,
      );
    } catch (error) {
      this.logger.error(
        `[QuickMatch] ❌ Error creating like notification: ${error.message}`,
        error.stack,
      );
      // Ne pas bloquer le like si la notification échoue
    }

    // Si c'est un match, créer l'enregistrement Match et les notifications de match
    if (isMatch) {
      // Mettre à jour le like inverse
      reverseLike.isMatch = true;
      await reverseLike.save();

      // Créer le match (s'assurer que user1 < user2 pour éviter les doublons)
      const user1Id = userId < profileId ? userId : profileId;
      const user2Id = userId < profileId ? profileId : userId;

      const existingMatch = await this.matchModel
        .findOne({
          user1: new Types.ObjectId(user1Id),
          user2: new Types.ObjectId(user2Id),
        })
        .exec();

      let matchDocument: MatchDocument | null = null;

      if (!existingMatch) {
        matchDocument = new this.matchModel({
          user1: new Types.ObjectId(user1Id),
          user2: new Types.ObjectId(user2Id),
          hasChatted: false,
        });
        await matchDocument.save();
        this.logger.log(
          `[QuickMatch] ✅ Match created between ${user1Id} and ${user2Id}`,
        );
      } else {
        matchDocument = existingMatch;
        this.logger.log(
          `[QuickMatch] Match already exists between ${user1Id} and ${user2Id}`,
        );
      }

      // Créer des notifications de match pour les deux utilisateurs
      try {
        const matchId = matchDocument._id.toString();
        const otherUserId = userId === user1Id ? user2Id : user1Id;
        const otherUser = userId === user1Id ? profile : user;

        this.logger.log(
          `[QuickMatch] Creating match notifications for both users`,
        );

        // Notification pour l'utilisateur actuel
        await this.notificationService.createNotification(
          userId,
          NotificationType.MATCH_MADE,
          '🎉 Nouveau Match !',
          `Vous avez un nouveau match avec ${profile.name} !`,
          {
            matchId: matchId,
            matchedUserId: profileId,
            matchedUserName: profile.name || profile.email,
            matchedUserAvatar: profile.profileImageUrl || profile.profileImageThumbnailUrl,
          },
        );

        // Notification pour l'autre utilisateur
        await this.notificationService.createNotification(
          profileId,
          NotificationType.MATCH_MADE,
          '🎉 Nouveau Match !',
          `Vous avez un nouveau match avec ${user.name} !`,
          {
            matchId: matchId,
            matchedUserId: userId,
            matchedUserName: user.name || user.email,
            matchedUserAvatar: user.profileImageUrl || user.profileImageThumbnailUrl,
          },
        );

        this.logger.log(
          `[QuickMatch] ✅ Match notifications created for both users`,
        );
      } catch (error) {
        this.logger.error(
          `[QuickMatch] ❌ Error creating match notifications: ${error.message}`,
          error.stack,
        );
        // Ne pas bloquer le match si les notifications échouent
      }
    }

    return { isMatch };
  }

  /**
   * Vérifie si deux utilisateurs se sont mutuellement likés (match)
   */
  async checkMatch(userId: string, profileId: string): Promise<boolean> {
    // Vérifier si un match existe
    const match = await this.matchModel
      .findOne({
        $or: [
          {
            user1: new Types.ObjectId(userId),
            user2: new Types.ObjectId(profileId),
          },
          {
            user1: new Types.ObjectId(profileId),
            user2: new Types.ObjectId(userId),
          },
        ],
      })
      .exec();

    return !!match;
  }

  /**
   * Enregistre un pass (utilisateur passe ce profil)
   *
   * IMPORTANT : Cette méthode doit être appelée à chaque fois qu'un utilisateur passe un profil
   */
  async passProfile(userId: string, profileId: string): Promise<void> {
    // Vérifier que les utilisateurs existent
    const user = await this.userModel.findById(userId).exec();
    const profile = await this.userModel.findById(profileId).exec();

    if (!user || !profile) {
      throw new NotFoundException('User or profile not found');
    }

    // Vérifier si le pass existe déjà
    const existingPass = await this.passModel
      .findOne({
        fromUser: new Types.ObjectId(userId),
        toUser: new Types.ObjectId(profileId),
      })
      .exec();

    if (existingPass) {
      throw new ConflictException('Profile already passed');
    }

    // Vérifier si l'utilisateur a déjà liké ce profil
    const existingLike = await this.likeModel
      .findOne({
        fromUser: new Types.ObjectId(userId),
        toUser: new Types.ObjectId(profileId),
      })
      .exec();

    if (existingLike) {
      throw new ConflictException('Cannot pass a profile that was liked');
    }

    // Créer le pass
    const pass = new this.passModel({
      fromUser: new Types.ObjectId(userId),
      toUser: new Types.ObjectId(profileId),
    });
    await pass.save();
  }

  /**
   * Récupère un profil par ID avec les données enrichies
   */
  async getProfileById(profileId: string): Promise<any> {
    const profile = await this.userModel.findById(profileId).exec();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Compter les activités créées par cet utilisateur
    const activitiesCount = await this.activityModel.countDocuments({
      creator: profile._id,
    }).exec();

    return {
      ...profile.toObject(),
      activitiesCount,
    };
  }

  /**
   * Récupère tous les matches d'un utilisateur
   */
  async getMatches(userId: string): Promise<any[]> {
    const matches = await this.matchModel
      .find({
        $or: [
          { user1: new Types.ObjectId(userId) },
          { user2: new Types.ObjectId(userId) },
        ],
      })
      .populate('user1', 'name email profileImageUrl')
      .populate('user2', 'name email profileImageUrl')
      .sort({ createdAt: -1 })
      .exec();

    return matches.map((match) => {
      const matchObj = match.toObject();
      const otherUser =
        matchObj.user1._id.toString() === userId ? matchObj.user2 : matchObj.user1;
      return {
        matchId: matchObj._id.toString(),
        user: otherUser,
        hasChatted: matchObj.hasChatted,
        chatId: matchObj.chatId?.toString(),
        createdAt: matchObj.createdAt,
      };
    });
  }

  /**
   * Récupère tous les likes reçus par un utilisateur
   * (utilisateurs qui ont liké son profil)
   */
  async getLikesReceived(userId: string): Promise<LikeDocument[]> {
    // Récupérer tous les likes où l'utilisateur connecté est le destinataire (toUser)
    const likes = await this.likeModel
      .find({ toUser: new Types.ObjectId(userId) })
      .populate('fromUser', 'name email profileImageUrl profileImageThumbnailUrl')
      .sort({ createdAt: -1 }) // Plus récents en premier
      .exec();

    return likes;
  }

  /**
   * Récupère un match entre deux utilisateurs
   */
  async getMatchByUsers(user1Id: string, user2Id: string): Promise<MatchDocument | null> {
    // Vérifier dans les deux sens (user1-user2 et user2-user1)
    const match = await this.matchModel
      .findOne({
        $or: [
          {
            user1: new Types.ObjectId(user1Id),
            user2: new Types.ObjectId(user2Id),
          },
          {
            user1: new Types.ObjectId(user2Id),
            user2: new Types.ObjectId(user1Id),
          },
        ],
      })
      .exec();

    return match;
  }
}
