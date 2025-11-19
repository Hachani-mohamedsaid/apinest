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
   * Formula: 100 + (level * 50)
   * Level 1→2: 100, Level 2→3: 150, Level 3→4: 200, etc.
   */
  private getXpForNextLevel(level: number): number {
    return 100 + level * 50;
  }

  /**
   * Calculate level from total XP
   * @param totalXp Total XP of user
   * @returns Level info object
   */
  calculateLevel(totalXp: number): {
    level: number;
    xpProgress: number;
    xpForNextLevel: number;
    progressPercentage: number;
  } {
    if (totalXp <= 0) {
      return {
        level: 1,
        xpProgress: totalXp,
        xpForNextLevel: this.getXpForNextLevel(1),
        progressPercentage: 0,
      };
    }

    let currentLevel = 1;
    let xpAccumulated = 0;

    // Find current level by checking each level's requirement
    for (let level = 1; level < this.MAX_LEVEL; level++) {
      const xpNeeded = this.getXpForNextLevel(level);
      const totalXpForNextLevel = xpAccumulated + xpNeeded;
      
      if (totalXp >= totalXpForNextLevel) {
        xpAccumulated = totalXpForNextLevel;
        currentLevel = level + 1;
      } else {
        break;
      }
    }

    // Cap at max level
    if (currentLevel > this.MAX_LEVEL) {
      currentLevel = this.MAX_LEVEL;
      const maxLevelXp = this.getTotalXpForLevel(this.MAX_LEVEL);
      return {
        level: this.MAX_LEVEL,
        xpProgress: totalXp - maxLevelXp,
        xpForNextLevel: 0,
        progressPercentage: 100,
      };
    }

    // Calculate progress to next level
    const xpForCurrentLevel = this.getTotalXpForLevel(currentLevel - 1);
    const xpProgress = totalXp - xpForCurrentLevel;
    const xpForNextLevel = this.getXpForNextLevel(currentLevel);
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
   */
  private getTotalXpForLevel(level: number): number {
    let total = 0;
    for (let l = 1; l < level; l++) {
      total += this.getXpForNextLevel(l);
    }
    return total;
  }

  /**
   * Get level information by level number
   */
  async getLevelInfo(levelNumber: number): Promise<LevelDocument | null> {
    return this.levelModel.findOne({ levelNumber }).exec();
  }
}

