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

    // Si l'utilisateur n'a aucun sport, retourner une liste vide
    if (allUserSports.length === 0) {
      this.logger.warn(
        `[QuickMatch] User ${userId} has no sports interests or activities`,
      );
      return { profiles: [], total: 0, page, totalPages: 0 };
    }

    // 6. Récupérer les IDs des profils déjà likés, matchés, ou passés récemment
    // Exclure les profils passés récents (7 derniers jours) pour éviter qu'ils réapparaissent immédiatement
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [likedProfiles, matchedProfiles, recentPasses] = await Promise.all([
      this.likeModel
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
      this.passModel
        .find({
          fromUser: new Types.ObjectId(userId),
          createdAt: { $gte: sevenDaysAgo }, // Seulement les passes récents (7 derniers jours)
        })
        .select('toUser')
        .exec(),
    ]);

    const excludedUserIds = new Set<string>();
    // Exclure les profils déjà likés (toujours exclus)
    likedProfiles.forEach((like) => excludedUserIds.add(like.toUser.toString()));
    // Exclure les profils avec lesquels on a déjà matché (toujours exclus)
    matchedProfiles.forEach((match) => {
      excludedUserIds.add(
        match.user1.toString() === userId
          ? match.user2.toString()
          : match.user1.toString(),
      );
    });
    // Exclure les profils passés récemment (moins de 7 jours) pour éviter qu'ils réapparaissent immédiatement
    // Les profils passés il y a plus de 7 jours peuvent réapparaître
    recentPasses.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));

    this.logger.log(
      `[QuickMatch] Excluded profiles - Liked: ${likedProfiles.length}, Matched: ${matchedProfiles.length}, Recent Passes: ${recentPasses.length}, Total excluded: ${excludedUserIds.size}`,
    );

    // Construire la liste des IDs à exclure
    const excludedUserIdsArray = Array.from(excludedUserIds);

    // 7. Construire la requête MongoDB
    const excludedIds = [
      new Types.ObjectId(userId), // Exclure l'utilisateur connecté
      ...excludedUserIdsArray.map((id) => new Types.ObjectId(id)),
    ];

    // 8. Requête pour trouver les utilisateurs avec au moins un sport en commun
    // Utiliser une recherche plus flexible pour les sports
    const query: any = {
      _id: { $nin: excludedIds },
    };

    if (allUserSports.length > 0) {
      // Recherche dans un array : utiliser une approche plus simple et fiable
      // Utiliser $in avec les valeurs exactes (case-insensitive) puis faire un filtrage flexible après
      // Mais pour une recherche flexible maintenant, utiliser $or avec regex
      
      // Nettoyer les sports (trim) pour la recherche
      const cleanedSports = allUserSports.map((sport) => sport.trim()).filter(Boolean);
      
      // Utiliser $in directement sur l'array pour une recherche plus simple et fiable
      // MongoDB $in cherche si au moins un élément de l'array correspond à une valeur dans la liste
      // Problème : $in est case-sensitive, donc on doit inclure les variations de casse
      // Solution : Inclure les valeurs originales ET lowercase pour couvrir les deux cas
      
      // Créer une liste avec les valeurs originales ET lowercase pour couvrir les variations de casse
      // Exemple : ["Running", "Swimming"] devient ["Running", "Swimming", "running", "swimming"]
      const sportsWithVariations = [
        ...cleanedSports, // Valeurs originales (ex: "Running")
        ...cleanedSports.map((sport) => sport.toLowerCase()), // Lowercase (ex: "running")
        ...cleanedSports.map((sport) => sport.toUpperCase()), // Uppercase (ex: "RUNNING")
      ];
      
      // Utiliser Set pour enlever les doublons
      const uniqueSports = [...new Set(sportsWithVariations)];
      
      query.sportsInterests = {
        $in: uniqueSports, // Recherche dans l'array avec variations de casse
      };
      
      this.logger.log(
        `[QuickMatch] Searching for users with sports matching: ${JSON.stringify(allUserSports)}`,
      );
      this.logger.log(
        `[QuickMatch] Using $in query with ${uniqueSports.length} sports (${cleanedSports.length} original + variations): ${JSON.stringify(cleanedSports.slice(0, 5))}${cleanedSports.length > 5 ? '...' : ''}`,
      );
      this.logger.log(
        `[QuickMatch] MongoDB query: sportsInterests $in with ${uniqueSports.length} sports (including case variations)`,
      );
    }

    // 9. Compter le total de profils compatibles AVANT filtrage par sports communs
    // Aussi compter TOUS les utilisateurs disponibles (sans filtre sports) pour debug
    const totalUsersAvailable = await this.userModel.countDocuments({
      _id: { $nin: excludedIds },
    }).exec();
    
    this.logger.log(
      `[QuickMatch] Total users available (excluding liked/matched/passed): ${totalUsersAvailable}`,
    );
    
    const totalBeforeFilter = await this.userModel.countDocuments(query).exec();
    this.logger.log(
      `[QuickMatch] Users found before sports filter: ${totalBeforeFilter}`,
    );
    
    if (totalBeforeFilter === 0 && totalUsersAvailable > 0) {
      this.logger.warn(
        `[QuickMatch] ⚠️ WARNING: No users found with sports filter but ${totalUsersAvailable} users available. This might indicate a problem with the sports query.`,
      );
    }

    // 10. Récupérer les profils avec pagination
    const skip = (page - 1) * limit;
    let allUsers = await this.userModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .exec();

    this.logger.log(
      `[QuickMatch] Users retrieved from DB with sports filter: ${allUsers.length}`,
    );

    // 11. Double vérification : filtrer les utilisateurs qui ont au moins un sport en commun
    // Filtre ASSOUPLI : afficher si UN SEUL sport est en commun (matching flexible)
    let compatibleProfiles = allUsers.filter((user) => {
      const userSports = user.sportsInterests || [];

      if (userSports.length === 0) {
        return false; // Exclure les utilisateurs sans sports
      }

      // Fonction pour normaliser un sport (enlever espaces, minuscules, caractères spéciaux)
      const normalizeSport = (sport: string): string => {
        return sport
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, ''); // Enlever tous les caractères non alphanumériques
      };

      // Vérifier s'il y a au moins UN sport en commun (matching très flexible)
      const hasCommonSport = allUserSports.some((sport) => {
        const normalizedSport = normalizeSport(sport);
        return userSports.some((userSport) => {
          const normalizedUserSport = normalizeSport(userSport);
          
          // Correspondance très flexible :
          // 1. Correspondance exacte après normalisation
          // 2. Correspondance partielle (contient)
          // 3. Correspondance partielle inverse (est contenu)
          // 4. Correspondance de début de mot (prefixe)
          return (
            normalizedUserSport === normalizedSport ||
            normalizedUserSport.includes(normalizedSport) ||
            normalizedSport.includes(normalizedUserSport) ||
            normalizedUserSport.startsWith(normalizedSport) ||
            normalizedSport.startsWith(normalizedUserSport)
          );
        });
      });

      return hasCommonSport;
    });
    
    this.logger.log(
      `[QuickMatch] Filtering profiles - UN SEUL sport en commun suffit pour afficher`,
    );

    this.logger.log(
      `[QuickMatch] Compatible profiles after sports filter: ${compatibleProfiles.length}`,
    );

    // IMPORTANT: On retourne SEULEMENT les profils avec AU MOINS UN sport en commun
    // Filtre assoupli : un seul sport en commun suffit pour afficher le profil
    if (compatibleProfiles.length === 0) {
      this.logger.warn(
        `[QuickMatch] No profiles found with at least one common sport. User sports: ${JSON.stringify(allUserSports)}`,
      );
    } else {
      this.logger.log(
        `[QuickMatch] Found ${compatibleProfiles.length} profiles with at least one common sport (relaxed filter - one sport enough)`,
      );
    }

    // Vérification finale : s'assurer qu'aucun profil exclu n'est présent
    const hasExcludedProfiles = compatibleProfiles.some((profile) => {
      const profileIdStr = profile._id.toString();
      return excludedUserIds.has(profileIdStr) || profileIdStr === userId;
    });

    if (hasExcludedProfiles) {
      this.logger.error(
        `[QuickMatch] ⚠️ WARNING: Found excluded profiles in results! Filtering them out...`,
      );
      compatibleProfiles = compatibleProfiles.filter((profile) => {
        const profileIdStr = profile._id.toString();
        return !excludedUserIds.has(profileIdStr) && profileIdStr !== userId;
      });
      this.logger.log(
        `[QuickMatch] After filtering excluded profiles: ${compatibleProfiles.length} profiles`,
      );
    }

    // 12. Compter le total final (uniquement les profils avec sports communs)
    // On utilise totalBeforeFilter qui compte déjà les profils avec sports communs (sauf exclus)
    const total = totalBeforeFilter;
    
    this.logger.log(
      `[QuickMatch] Final total profiles with common sports: ${total}`,
    );

    // 12. Enrichir avec les données des activités et distance
    const enrichedProfiles = await Promise.all(
      compatibleProfiles.map(async (user) => {
        // Compter les activités créées par cet utilisateur
        const activitiesCount = await this.activityModel.countDocuments({
          creator: user._id,
        }).exec();

        // Calculer la distance (si on a les coordonnées GPS)
        const distance = this.calculateDistance(currentUser, user);

        return {
          ...user.toObject(),
          activitiesCount,
          distance: distance !== null ? `${distance.toFixed(1)} km` : null,
        };
      }),
    );

    // 13. Trier par pertinence (nombre de sports en commun, distance, etc.)
    const sortedProfiles = this.sortByRelevance(enrichedProfiles, allUserSports);

    const totalPages = Math.ceil(total / limit);

    return {
      profiles: sortedProfiles,
      total,
      page,
      totalPages,
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
