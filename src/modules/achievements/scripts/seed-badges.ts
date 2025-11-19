import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { BadgeDefinition, BadgeRarity, BadgeCategory } from '../schemas/badge-definition.schema';
import { getModelToken } from '@nestjs/mongoose';

async function seedBadges() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const badgeModel = app.get(getModelToken(BadgeDefinition.name));

  const badges = [
    {
      name: 'Marathon Runner',
      description: 'Completed 5+ running events',
      iconUrl: '🏃',
      rarity: BadgeRarity.RARE,
      category: BadgeCategory.ACTIVITY,
      unlockCriteria: { type: 'activity_count', activity_type: 'Running', count: 5 },
      xpReward: 75,
      isActive: true,
    },
    {
      name: 'Water Warrior',
      description: 'Joined 10+ swimming sessions',
      iconUrl: '🏊',
      rarity: BadgeRarity.COMMON,
      category: BadgeCategory.ACTIVITY,
      unlockCriteria: { type: 'activity_count', activity_type: 'swimming', count: 10 },
      xpReward: 75,
      isActive: true,
    },
    {
      name: 'Social Butterfly',
      description: 'Connected with 25+ athletes',
      iconUrl: '👥',
      rarity: BadgeRarity.UNCOMMON,
      category: BadgeCategory.SOCIAL,
      unlockCriteria: { type: 'social_connections', count: 25 },
      xpReward: 75,
      isActive: true,
    },
    {
      name: 'Top Host',
      description: 'Hosted 10+ successful events',
      iconUrl: '⭐',
      rarity: BadgeRarity.RARE,
      category: BadgeCategory.MILESTONE,
      unlockCriteria: { type: 'host_events', count: 10 },
      xpReward: 75,
      isActive: true,
    },
    {
      name: 'Consistency King',
      description: 'Maintain a 30-day streak',
      iconUrl: '🔥',
      rarity: BadgeRarity.EPIC,
      category: BadgeCategory.STREAK,
      unlockCriteria: { type: 'streak_days', days: 30 },
      xpReward: 75,
      isActive: true,
    },
  ];

  try {
    // Clear existing badges (optional - comment out if you want to keep existing)
    // await badgeModel.deleteMany({}).exec();

    // Insert badges
    for (const badge of badges) {
      const existing = await badgeModel.findOne({ name: badge.name }).exec();
      if (!existing) {
        await badgeModel.create(badge);
        console.log(`✅ Created badge: ${badge.name}`);
      } else {
        console.log(`⏭️  Badge already exists: ${badge.name}`);
      }
    }

    console.log('✅ Badge seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding badges:', error);
  } finally {
    await app.close();
  }
}

seedBadges();

