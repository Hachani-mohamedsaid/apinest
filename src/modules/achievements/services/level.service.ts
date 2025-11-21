import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Level, LevelDocument } from '../schemas/level.schema';

@Injectable()
export class LevelService implements OnModuleInit {
  private readonly logger = new Logger(LevelService.name);
  private readonly MAX_LEVEL = 100;

  constructor(@InjectModel(Level.name) private readonly levelModel: Model<LevelDocument>) {}

  /**
   * Initialize 100 levels in database on module init
   */
  async onModuleInit() {
    try {
      const existingLevels = await this.levelModel.countDocuments().exec();
      if (existingLevels === 0) {
        this.logger.log('Initializing levels in database...');
        await this.initializeLevels();
        this.logger.log('✅ Levels initialized successfully');
      } else {
        this.logger.log(`Levels already exist (${existingLevels} levels found)`);
      }
    } catch (error) {
      this.logger.error(`Error initializing levels: ${error.message}`);
    }
  }

  /**
   * Initialize all 100 levels
   */
  private async initializeLevels(): Promise<void> {
    const levels: Partial<Level>[] = [];
    let totalXpRequired = 0;

    for (let level = 1; level <= this.MAX_LEVEL; level++) {
      const xpForNextLevel = this.getXpForNextLevel(level);
      totalXpRequired += xpForNextLevel;

      levels.push({
        levelNumber: level,
        xpRequired: totalXpRequired,
        xpForNextLevel: xpForNextLevel,
        rewards: {},
      });
    }

    await this.levelModel.insertMany(levels);
  }

  /**
   * Calculate XP needed for next level
   * Progressive formula:
   * - Niveau 1 → 2 : 100 XP
   * - Niveau 2 → 3 : 283 XP
   * - Niveau 3 → 4 : 520 XP
   * - Niveau N → N+1 : formule polynomiale basée sur les valeurs données
   * 
   * Formule polynomiale: XP = a * level^2 + b * level + c
   * Résolue pour correspondre aux 3 premières valeurs
   */
  private getXpForNextLevel(level: number): number {
    // Valeurs exactes pour les 3 premiers niveaux
    const exactValues: Record<number, number> = {
      1: 100,
      2: 283,
      3: 520,
    };
    
    if (exactValues[level]) {
      return exactValues[level];
    }
    
    // Pour les niveaux suivants, utiliser une formule polynomiale
    // Basée sur l'interpolation des 3 premières valeurs
    // On cherche une formule qui passe par (1,100), (2,283), (3,520)
    // Formule: XP = a * level^2 + b * level + c
    
    // Résolution du système d'équations:
    // 100 = a*1^2 + b*1 + c  =>  a + b + c = 100
    // 283 = a*2^2 + b*2 + c  =>  4a + 2b + c = 283
    // 520 = a*3^2 + b*3 + c  =>  9a + 3b + c = 520
    
    // Résolution:
    // a = 27, b = 102, c = -29
    // Vérification:
    // 27*1^2 + 102*1 - 29 = 100 ✓
    // 27*4 + 102*2 - 29 = 283 ✓
    // 27*9 + 102*3 - 29 = 520 ✓
    
    const a = 27;
    const b = 102;
    const c = -29;
    
    const xp = a * level * level + b * level + c;
    return Math.round(xp);
  }

  /**
   * Calculate level from total XP using progressive formula
   * - Niveau 1 : 0-99 XP (0 XP pour niveau 1, 100 XP pour niveau 2)
   * - Niveau 2 : 100-382 XP (100 XP pour niveau 2, 383 XP pour niveau 3)
   * - Niveau 3 : 383-902 XP (383 XP pour niveau 3, 903 XP pour niveau 4)
   * @param totalXp Total XP of user
   * @returns Level info object
   */
  calculateLevel(totalXp: number): {
    level: number;
    xpProgress: number;
    xpForNextLevel: number;
    progressPercentage: number;
  } {
    if (totalXp < 0) {
      totalXp = 0;
    }

    // Trouver le niveau en calculant le total XP requis pour chaque niveau
    let currentLevel = 1;
    let totalXpForCurrentLevel = 0;
    let totalXpForNextLevel = 0;

    // Calculer le niveau en accumulant les XP nécessaires
    for (let level = 1; level <= this.MAX_LEVEL; level++) {
      const xpForThisLevel = this.getXpForNextLevel(level);
      totalXpForNextLevel = totalXpForCurrentLevel + xpForThisLevel;
      
      if (totalXp >= totalXpForCurrentLevel && totalXp < totalXpForNextLevel) {
        currentLevel = level;
        break;
      }
      
      totalXpForCurrentLevel = totalXpForNextLevel;
      currentLevel = level + 1;
    }

    // Cap at max level
    currentLevel = Math.min(currentLevel, this.MAX_LEVEL);

    // Recalculer les valeurs pour le niveau actuel
    totalXpForCurrentLevel = 0;
    for (let level = 1; level < currentLevel; level++) {
      totalXpForCurrentLevel += this.getXpForNextLevel(level);
    }

    // XP dans le niveau actuel (XP total - XP minimum pour ce niveau)
    const xpProgress = totalXp - totalXpForCurrentLevel;

    // XP nécessaire pour passer au niveau suivant
    const xpForNextLevel = currentLevel >= this.MAX_LEVEL 
      ? 0 
      : this.getXpForNextLevel(currentLevel);

    // Pourcentage de progression
    const progressPercentage = xpForNextLevel > 0 
      ? Math.min(100, Math.round((xpProgress / xpForNextLevel) * 100))
      : 100;

    return {
      level: currentLevel,
      xpProgress,
      xpForNextLevel,
      progressPercentage,
    };
  }

  /**
   * Get total XP required to reach a specific level
   * Calculates cumulative XP needed from level 1 to the target level
   */
  private getTotalXpForLevel(level: number): number {
    if (level <= 1) return 0;
    
    let totalXp = 0;
    for (let l = 1; l < level; l++) {
      totalXp += this.getXpForNextLevel(l);
    }
    return totalXp;
  }

  /**
   * Get level information by level number
   */
  async getLevelInfo(levelNumber: number): Promise<LevelDocument | null> {
    return this.levelModel.findOne({ levelNumber }).exec();
  }
}

