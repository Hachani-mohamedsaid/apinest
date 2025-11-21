// Script MongoDB pour créer les badges de création d'activité
// Usage: mongo <database_name> create-activity-creation-badges.js
// ou: mongosh <database_name> create-activity-creation-badges.js

// Connexion à la base de données
// Assurez-vous d'être connecté à la bonne base de données

print("🏆 Création des badges de création d'activité...");

// Badge 1: Premier Hôte
const premierHote = {
  name: "Premier Hôte",
  description: "Créer votre première activité",
  iconUrl: "🎨",
  rarity: "common",
  category: "creation",
  isActive: true,
  unlockCriteria: {
    type: "activity_creation_count",
    count: 1
  },
  xpReward: 100,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Badge 2: Hôte Populaire
const hotePopulaire = {
  name: "Hôte Populaire",
  description: "Créer 5 activités",
  iconUrl: "👑",
  rarity: "rare",
  category: "creation",
  isActive: true,
  unlockCriteria: {
    type: "activity_creation_count",
    count: 5
  },
  xpReward: 250,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Badge 3: Organisateur Pro
const organisateurPro = {
  name: "Organisateur Pro",
  description: "Créer 10 activités",
  iconUrl: "🏆",
  rarity: "epic",
  category: "creation",
  isActive: true,
  unlockCriteria: {
    type: "activity_creation_count",
    count: 10
  },
  xpReward: 500,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Badge 4: Maître Organisateur (optionnel)
const maitreOrganisateur = {
  name: "Maître Organisateur",
  description: "Créer 25 activités",
  iconUrl: "🌟",
  rarity: "legendary",
  category: "creation",
  isActive: true,
  unlockCriteria: {
    type: "activity_creation_count",
    count: 25
  },
  xpReward: 1000,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Collection
const collection = db.badgedefinitions;

// Vérifier si les badges existent déjà
const existingBadges = collection.find({
  name: { $in: ["Premier Hôte", "Hôte Populaire", "Organisateur Pro", "Maître Organisateur"] }
}).toArray();

if (existingBadges.length > 0) {
  print(`⚠️  ${existingBadges.length} badge(s) existent déjà.`);
  print("Voulez-vous les mettre à jour ? (O/N)");
  // Pour automatiser, on supprime les anciens et on recrée
  collection.deleteMany({
    name: { $in: ["Premier Hôte", "Hôte Populaire", "Organisateur Pro", "Maître Organisateur"] }
  });
  print("✅ Anciens badges supprimés.");
}

// Insérer les badges
try {
  const result1 = collection.insertOne(premierHote);
  print(`✅ Badge créé: ${premierHote.name} (ID: ${result1.insertedId})`);

  const result2 = collection.insertOne(hotePopulaire);
  print(`✅ Badge créé: ${hotePopulaire.name} (ID: ${result2.insertedId})`);

  const result3 = collection.insertOne(organisateurPro);
  print(`✅ Badge créé: ${organisateurPro.name} (ID: ${result3.insertedId})`);

  const result4 = collection.insertOne(maitreOrganisateur);
  print(`✅ Badge créé: ${maitreOrganisateur.name} (ID: ${result4.insertedId})`);

  print("\n🎉 Tous les badges ont été créés avec succès !");
  
  // Afficher un résumé
  print("\n📊 Résumé des badges créés:");
  const allBadges = collection.find({
    unlockCriteria: { type: "activity_creation_count" }
  }).toArray();
  
  allBadges.forEach(badge => {
    print(`  - ${badge.name} (${badge.rarity}): ${badge.description} - ${badge.xpReward} XP`);
  });
  
} catch (error) {
  print(`❌ Erreur lors de la création des badges: ${error}`);
}

print("\n✅ Script terminé !");

