import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ChallengeDefinition, ChallengeType } from '../src/modules/achievements/schemas/challenge-definition.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function initAllChallenges() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const challengeModel = app.get<Model<ChallengeDefinition>>(
    getModelToken(ChallengeDefinition.name),
  );

  console.log('🎯 Initialisation de tous les challenges...\n');

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(23, 59, 59, 999);

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  nextMonth.setHours(23, 59, 59, 999);

  // Challenges Quotidiens
  const dailyChallenges = [
    {
      name: 'Défi Quotidien',
      description: "Compléter 2 activités aujourd'hui",
      challengeType: ChallengeType.DAILY,
      xpReward: 200,
      targetCount: 2,
      unlockCriteria: {
        type: 'activities_in_period',
        period: 'day',
        count: 2,
      },
      startDate: now,
      endDate: tomorrow,
      isActive: true,
    },
    {
      name: 'Marcheur du Jour',
      description: "Parcourir 5 km aujourd'hui",
      challengeType: ChallengeType.DAILY,
      xpReward: 150,
      targetCount: 5,
      unlockCriteria: {
        type: 'distance_in_period',
        period: 'day',
        km: 5,
      },
      startDate: now,
      endDate: tomorrow,
      isActive: true,
    },
    {
      name: 'Endurance Quotidienne',
      description: "Accumuler 60 minutes d'activité aujourd'hui",
      challengeType: ChallengeType.DAILY,
      xpReward: 180,
      targetCount: 60,
      unlockCriteria: {
        type: 'duration_in_period',
        period: 'day',
        minutes: 60,
      },
      startDate: now,
      endDate: tomorrow,
      isActive: true,
    },
    {
      name: 'Créateur Actif',
      description: "Créer 1 activité aujourd'hui",
      challengeType: ChallengeType.DAILY,
      xpReward: 100,
      targetCount: 1,
      unlockCriteria: {
        type: 'activities_in_period',
        period: 'day',
        count: 1,
        action: 'create',
      },
      startDate: now,
      endDate: tomorrow,
      isActive: true,
    },
  ];

  // Challenges Hebdomadaires
  const weeklyChallenges = [
    {
      name: 'Défi Hebdomadaire',
      description: 'Compléter 5 activités cette semaine',
      challengeType: ChallengeType.WEEKLY,
      xpReward: 500,
      targetCount: 5,
      unlockCriteria: {
        type: 'activities_in_period',
        period: 'week',
        count: 5,
      },
      startDate: now,
      endDate: nextMonday,
      isActive: true,
    },
    {
      name: 'Coureur de la Semaine',
      description: 'Parcourir 25 km cette semaine',
      challengeType: ChallengeType.WEEKLY,
      xpReward: 600,
      targetCount: 25,
      unlockCriteria: {
        type: 'distance_in_period',
        period: 'week',
        km: 25,
      },
      startDate: now,
      endDate: nextMonday,
      isActive: true,
    },
    {
      name: 'Sportif Régulier',
      description: 'Accumuler 300 minutes d\'activité cette semaine',
      challengeType: ChallengeType.WEEKLY,
      xpReward: 550,
      targetCount: 300,
      unlockCriteria: {
        type: 'duration_in_period',
        period: 'week',
        minutes: 300,
      },
      startDate: now,
      endDate: nextMonday,
      isActive: true,
    },
    {
      name: 'Variété Sportive',
      description: 'Pratiquer 3 sports différents cette semaine',
      challengeType: ChallengeType.WEEKLY,
      xpReward: 400,
      targetCount: 3,
      unlockCriteria: {
        type: 'sport_variety',
        period: 'week',
        unique_sports: 3,
      },
      startDate: now,
      endDate: nextMonday,
      isActive: true,
    },
    {
      name: 'Weekend Actif',
      description: 'Compléter 2 activités pendant le weekend',
      challengeType: ChallengeType.WEEKLY,
      xpReward: 300,
      targetCount: 2,
      unlockCriteria: {
        type: 'activities_in_period',
        period: 'weekend',
        count: 2,
      },
      startDate: now,
      endDate: nextMonday,
      isActive: true,
    },
    {
      name: 'Organisateur de la Semaine',
      description: 'Créer 3 activités cette semaine',
      challengeType: ChallengeType.WEEKLY,
      xpReward: 350,
      targetCount: 3,
      unlockCriteria: {
        type: 'activities_in_period',
        period: 'week',
        count: 3,
        action: 'create',
      },
      startDate: now,
      endDate: nextMonday,
      isActive: true,
    },
  ];

  // Challenges Mensuels
  const monthlyChallenges = [
    {
      name: 'Marathon Mensuel',
      description: 'Compléter 20 activités ce mois',
      challengeType: ChallengeType.MONTHLY,
      xpReward: 1500,
      targetCount: 20,
      unlockCriteria: {
        type: 'activities_in_period',
        period: 'month',
        count: 20,
      },
      startDate: now,
      endDate: nextMonth,
      isActive: true,
    },
    {
      name: 'Explorateur Mensuel',
      description: 'Parcourir 100 km ce mois',
      challengeType: ChallengeType.MONTHLY,
      xpReward: 2000,
      targetCount: 100,
      unlockCriteria: {
        type: 'distance_in_period',
        period: 'month',
        km: 100,
      },
      startDate: now,
      endDate: nextMonth,
      isActive: true,
    },
    {
      name: 'Endurance Mensuelle',
      description: 'Accumuler 1200 minutes d\'activité ce mois',
      challengeType: ChallengeType.MONTHLY,
      xpReward: 1800,
      targetCount: 1200,
      unlockCriteria: {
        type: 'duration_in_period',
        period: 'month',
        minutes: 1200,
      },
      startDate: now,
      endDate: nextMonth,
      isActive: true,
    },
    {
      name: 'Maître Organisateur',
      description: 'Créer 10 activités ce mois',
      challengeType: ChallengeType.MONTHLY,
      xpReward: 1200,
      targetCount: 10,
      unlockCriteria: {
        type: 'activities_in_period',
        period: 'month',
        count: 10,
        action: 'create',
      },
      startDate: now,
      endDate: nextMonth,
      isActive: true,
    },
    {
      name: 'Polyvalent Mensuel',
      description: 'Pratiquer 5 sports différents ce mois',
      challengeType: ChallengeType.MONTHLY,
      xpReward: 1000,
      targetCount: 5,
      unlockCriteria: {
        type: 'sport_variety',
        period: 'month',
        unique_sports: 5,
      },
      startDate: now,
      endDate: nextMonth,
      isActive: true,
    },
  ];

  const allChallenges = [
    ...dailyChallenges,
    ...weeklyChallenges,
    ...monthlyChallenges,
  ];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const challengeData of allChallenges) {
    const existing = await challengeModel
      .findOne({
        name: challengeData.name,
        challengeType: challengeData.challengeType,
      })
      .exec();

    if (existing) {
      // Mettre à jour les dates et critères
      existing.description = challengeData.description;
      existing.xpReward = challengeData.xpReward;
      existing.targetCount = challengeData.targetCount;
      existing.unlockCriteria = challengeData.unlockCriteria;
      existing.startDate = challengeData.startDate;
      existing.endDate = challengeData.endDate;
      existing.isActive = challengeData.isActive;
      await existing.save();
      console.log(`🔄 Challenge "${challengeData.name}" mis à jour`);
      updated++;
    } else {
      await challengeModel.create(challengeData);
      console.log(`✅ Challenge "${challengeData.name}" créé`);
      created++;
    }
  }

  console.log('\n📊 Résumé :');
  console.log(`   ✅ Créés : ${created}`);
  console.log(`   🔄 Mis à jour : ${updated}`);
  console.log(`   ⏭️  Ignorés : ${skipped}`);
  console.log(`\n🎯 Total : ${allChallenges.length} challenges initialisés !`);

  await app.close();
}

initAllChallenges().catch((error) => {
  console.error('❌ Erreur lors de l\'initialisation des challenges:', error);
  process.exit(1);
});

