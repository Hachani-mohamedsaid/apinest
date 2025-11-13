import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { Like, LikeDocument } from './schemas/like.schema';
import { Match, MatchDocument } from './schemas/match.schema';
import { Pass, PassDocument } from './schemas/pass.schema';

@Injectable()
export class QuickMatchService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Pass.name) private passModel: Model<PassDocument>,
  ) {}

  /**
   * Récupère les profils compatibles avec l'utilisateur connecté
   * Filtre par sports/intérêts communs basés sur les activités
   * Exclut les profils déjà likés, passés ou matchés
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

    // 3. Récupérer les activités créées par l'utilisateur
    const userActivities = await this.activityModel
      .find({ creator: new Types.ObjectId(userId) })
      .exec();

    // 4. Extraire les sports des activités de l'utilisateur
    const activitySports = userActivities.map((activity) => activity.sportType);
    const allUserSports = [
      ...new Set([...userSportsInterests, ...activitySports]),
    ].filter(Boolean); // Filtrer les valeurs vides

    // Si l'utilisateur n'a aucun sport, retourner une liste vide
    if (allUserSports.length === 0) {
      return { profiles: [], total: 0, page, totalPages: 0 };
    }

    // 5. Récupérer les IDs des profils déjà likés, passés ou matchés
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

    const excludedUserIds = new Set<string>();
    likedProfiles.forEach((like) => excludedUserIds.add(like.toUser.toString()));
    passedProfiles.forEach((pass) => excludedUserIds.add(pass.toUser.toString()));
    matchedProfiles.forEach((match) => {
      excludedUserIds.add(
        match.user1.toString() === userId
          ? match.user2.toString()
          : match.user1.toString(),
      );
    });

    // 6. Construire la requête MongoDB pour filtrer les utilisateurs
    const excludedIds = [
      new Types.ObjectId(userId),
      ...Array.from(excludedUserIds).map((id) => new Types.ObjectId(id)),
    ];

    const query: any = {
      _id: { $nin: excludedIds },
    };

    // Filtrer par sports communs (au moins un sport en commun)
    if (allUserSports.length > 0) {
      query.sportsInterests = {
        $in: allUserSports.map((sport) => new RegExp(sport, 'i')),
      };
    }

    // 7. Compter le total de profils compatibles
    const total = await this.userModel.countDocuments(query).exec();

    // 8. Récupérer les profils avec pagination
    const skip = (page - 1) * limit;
    const allUsers = await this.userModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .exec();

    // 9. Filtrer les utilisateurs qui ont au moins un sport/intérêt commun (double vérification)
    const compatibleProfiles = allUsers.filter((user) => {
      const userSports = user.sportsInterests || [];

      // Vérifier s'il y a au moins un sport en commun (case-insensitive)
      const hasCommonSport = allUserSports.some((sport) =>
        userSports.some(
          (userSport) =>
            userSport.toLowerCase().trim() === sport.toLowerCase().trim(),
        ),
      );

      return hasCommonSport;
    });

    // 10. Enrichir avec les données des activités et distance
    const enrichedProfiles = await Promise.all(
      compatibleProfiles.map(async (user) => {
        // Compter les activités créées par cet utilisateur
        const activitiesCount = await this.activityModel.countDocuments({
          creator: user._id,
        }).exec();

        // Calculer la distance (si on a les coordonnées GPS)
        const distance = this.calculateDistance(
          currentUser,
          user,
        );

        return {
          ...user.toObject(),
          activitiesCount,
          distance: distance !== null ? `${distance.toFixed(1)} km` : null,
        };
      }),
    );

    // 11. Trier par pertinence (nombre de sports en commun, distance, etc.)
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
   * - Nombre de sports en commun
   * - Nombre d'activités
   * - Distance (si disponible)
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

    // Si c'est un match, créer l'enregistrement Match
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

      if (!existingMatch) {
        const match = new this.matchModel({
          user1: new Types.ObjectId(user1Id),
          user2: new Types.ObjectId(user2Id),
          hasChatted: false,
        });
        await match.save();
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
}
