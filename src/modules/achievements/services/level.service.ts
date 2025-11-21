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
   * Simple formula: 150 XP per level
   * Level 1→2: 150, Level 2→3: 150, Level 3→4: 150, etc.
   */
  private getXpForNextLevel(level: number): number {
    return 150;
  }

  /**
   * Calculate level from total XP using simple formula
   * Formula: floor(totalXp / 150) + 1
   * - Niveau 1 : 0-149 XP
   * - Niveau 2 : 150-299 XP
   * - Niveau 3 : 300-499 XP
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

    // Simple formula: level = floor(totalXp / 150) + 1
    const level = Math.floor(totalXp / 150) + 1;

    // Cap at max level
    const currentLevel = Math.min(level, this.MAX_LEVEL);

    // XP minimum pour atteindre ce niveau
    const xpForCurrentLevel = (currentLevel - 1) * 150;

    // XP dans le niveau actuel (XP total - XP minimum pour ce niveau)
    const xpProgress = totalXp - xpForCurrentLevel;

    // XP nécessaire pour passer au niveau suivant (dans le niveau actuel)
    const xpForNextLevel = currentLevel >= this.MAX_LEVEL ? 0 : 150;

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
   * Formula: (level - 1) * 150
   */
  private getTotalXpForLevel(level: number): number {
    return (level - 1) * 150;
  }

  /**
   * Get level information by level number
   */
  async getLevelInfo(levelNumber: number): Promise<LevelDocument | null> {
    return this.levelModel.findOne({ levelNumber }).exec();
  }
}

