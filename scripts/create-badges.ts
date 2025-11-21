import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BadgeDefinition, BadgeRarity, BadgeCategory } from '../src/modules/achievements/schemas/badge-definition.schema';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function createBadges() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const badgeModel = app.get<Model<BadgeDefinition>>(
    getModelToken(BadgeDefinition.name),
  );

  console.log('🏆 Création des badges dans MongoDB...\n');

  const badges = [
    // Badges de Création d'Activité
    {
      name: 'Premier Hôte',
      description: 'Créer votre première activité',
      iconUrl: '🏠',
      rarity: BadgeRarity.COMMON,
      category: BadgeCategory.ACTIVITY,
      xpReward: 100,
      isActive: true,
      unlockCriteria: {
        type: 'activity_creation_count',
        count: 1,
      },
    },
    {
      name: 'Hôte Populaire',
      description: 'Créer 5 activités',
      iconUrl: '👥',
      rarity: BadgeRarity.UNCOMMON,
      category: BadgeCategory.ACTIVITY,
      xpReward: 250,
      isActive: true,
      unlockCriteria: {
        type: 'activity_creation_count',
        count: 5,
      },
    },
    {
      name: 'Organisateur Pro',
      description: 'Créer 10 activités',
      iconUrl: '⭐',
      rarity: BadgeRarity.RARE,
      category: BadgeCategory.ACTIVITY,
      xpReward: 500,
      isActive: true,
      unlockCriteria: {
        type: 'activity_creation_count',
        count: 10,
      },
    },
    // Badges de Complétion d'Activité
    {
      name: 'Premier Pas',
      description: 'Compléter votre première activité',
      iconUrl: '👣',
      rarity: BadgeRarity.COMMON,
      category: BadgeCategory.ACTIVITY,
      xpReward: 100,
      isActive: true,
      unlockCriteria: {
        type: 'activity_count',
        count: 1,
      },
    },
    {
      name: 'Sportif Actif',
      description: 'Compléter 5 activités',
      iconUrl: '🏃',
      rarity: BadgeRarity.UNCOMMON,
      category: BadgeCategory.ACTIVITY,
      xpReward: 250,
      isActive: true,
      unlockCriteria: {
        type: 'activity_count',
        count: 5,
      },
    },
    {
      name: 'Champion',
      description: 'Compléter 10 activités',
      iconUrl: '🏆',
      rarity: BadgeRarity.RARE,
      category: BadgeCategory.ACTIVITY,
      xpReward: 500,
      isActive: true,
      unlockCriteria: {
        type: 'activity_count',
        count: 10,
      },
    },
    // Badges de Distance
    {
      name: 'Coureur Débutant',
      description: 'Parcourir 10 km au total',
      iconUrl: '🏃',
      rarity: BadgeRarity.COMMON,
      category: BadgeCategory.ACTIVITY,
      xpReward: 150,
      isActive: true,
      unlockCriteria: {
        type: 'distance_total',
        km: 10,
      },
    },
    {
      name: 'Marathonien',
      description: 'Parcourir 50 km au total',
      iconUrl: '🏅',
      rarity: BadgeRarity.RARE,
      category: BadgeCategory.ACTIVITY,
      xpReward: 500,
      isActive: true,
      unlockCriteria: {
        type: 'distance_total',
        km: 50,
      },
    },
    // Badges de Durée
    {
      name: 'Débutant',
      description: 'Accumuler 60 minutes d\'activité',
      iconUrl: '⏱️',
      rarity: BadgeRarity.COMMON,
      category: BadgeCategory.ACTIVITY,
      xpReward: 100,
      isActive: true,
      unlockCriteria: {
        type: 'duration_total',
        minutes: 60,
      },
    },
    {
      name: 'Entraîné',
      description: 'Accumuler 300 minutes d\'activité',
      iconUrl: '💪',
      rarity: BadgeRarity.UNCOMMON,
      category: BadgeCategory.ACTIVITY,
      xpReward: 500,
      isActive: true,
      unlockCriteria: {
        type: 'duration_total',
        minutes: 300,
      },
    },
    // Badges de Série
    {
      name: 'Début de Série',
      description: 'Maintenir une série de 3 jours',
      iconUrl: '🔥',
      rarity: BadgeRarity.COMMON,
      category: BadgeCategory.STREAK,
      xpReward: 150,
      isActive: true,
      unlockCriteria: {
        type: 'streak_days',
        days: 3,
      },
    },
    {
      name: 'Série Régulière',
      description: 'Maintenir une série de 7 jours',
      iconUrl: '🔥🔥',
      rarity: BadgeRarity.UNCOMMON,
      category: BadgeCategory.STREAK,
      xpReward: 300,
      isActive: true,
      unlockCriteria: {
        type: 'streak_days',
        days: 7,
      },
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const badgeData of badges) {
    const existing = await badgeModel.findOne({ name: badgeData.name }).exec();
    
    if (existing) {
      console.log(`⏭️  Badge "${badgeData.name}" existe déjà, ignoré`);
      skipped++;
      continue;
    }

    const badge = new badgeModel(badgeData);
    await badge.save();
    console.log(`✅ Badge "${badgeData.name}" créé avec succès`);
    created++;
  }

  console.log(`\n📊 Résumé :`);
  console.log(`   ✅ ${created} badges créés`);
  console.log(`   ⏭️  ${skipped} badges ignorés (déjà existants)`);
  console.log(`   📦 Total : ${badges.length} badges\n`);

  // Vérifier les badges actifs
  const activeBadges = await badgeModel.find({ isActive: true }).exec();
  console.log(`🏆 ${activeBadges.length} badges actifs dans la base de données\n`);

  await app.close();
}

createBadges()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });

