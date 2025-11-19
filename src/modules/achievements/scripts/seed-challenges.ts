import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { ChallengeDefinition, ChallengeType } from '../schemas/challenge-definition.schema';
import { getModelToken } from '@nestjs/mongoose';

async function seedChallenges() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const challengeModel = app.get(getModelToken(ChallengeDefinition.name));

  // Calculate dates for challenges
  const now = new Date();
  const nextWeekend = new Date(now);
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = 6 - dayOfWeek;
  nextWeekend.setDate(now.getDate() + daysUntilSaturday);
  nextWeekend.setHours(0, 0, 0, 0);
  const weekendEnd = new Date(nextWeekend);
  weekendEnd.setDate(nextWeekend.getDate() + 1);
  weekendEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const challenges = [
    {
      name: 'Weekend Warrior',
      description: 'Complete 4 activities this weekend',
      challengeType: ChallengeType.WEEKLY,
      startDate: nextWeekend,
      endDate: weekendEnd,
      xpReward: 100,
      targetCount: 4,
      unlockCriteria: {
        type: 'activities_in_period',
        count: 4,
        period: 'weekend',
        activity_types: ['any'],
      },
      isActive: true,
    },
    {
      name: 'Variety Seeker',
      description: 'Try 3 different sports this week',
      challengeType: ChallengeType.WEEKLY,
      startDate: weekStart,
      endDate: weekEnd,
      xpReward: 150,
      targetCount: 3,
      unlockCriteria: {
        type: 'sport_variety',
        different_sports: 3,
        period: 'week',
      },
      isActive: true,
    },
  ];

  try {
    // Insert challenges
    for (const challenge of challenges) {
      const existing = await challengeModel.findOne({ name: challenge.name }).exec();
      if (!existing) {
        await challengeModel.create(challenge);
        console.log(`✅ Created challenge: ${challenge.name}`);
      } else {
        console.log(`⏭️  Challenge already exists: ${challenge.name}`);
      }
    }

    console.log('✅ Challenge seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding challenges:', error);
  } finally {
    await app.close();
  }
}

seedChallenges();

