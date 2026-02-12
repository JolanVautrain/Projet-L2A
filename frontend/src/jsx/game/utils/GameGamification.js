/**
 * Système de gamification avec achievements et progression
 */

/**
 * Calcule l'XP gagné avec une courbe de progression exponentielle progressive
 */
export function calculateXPReward(finalScore, stage, timerSeconds) {
  // Formule : Score base + Stage bonus exponentiel + Temps bonus
  // Score base : 1 XP par 10 points (minimum 5)
  const baseXP = Math.max(5, Math.floor(finalScore / 10));
  
  // Stage bonus : croissance exponentielle
  // Stage 1: 1 XP, Stage 5: 10 XP, Stage 10: 30 XP, Stage 20: 100 XP
  const stageBonus = Math.floor(Math.pow(stage, 1.6));
  
  // Temps bonus : 1 XP par 5 secondes jouées
  const timeBonus = Math.floor(timerSeconds / 5);
  
  // Bonus multiplicateur si survie longue (> 30s = +20%)
  const survivalMultiplier = timerSeconds > 30 ? 1.2 : 1;
  
  return Math.floor((baseXP + stageBonus + timeBonus) * survivalMultiplier);
}

/**
 * Détermine le niveau du joueur basé sur l'XP total
 * Courbe non-linéaire : chaque niveau demande 50% plus d'XP que le précédent
 */
export function getLevelFromXP(totalXP) {
  let level = 1;
  let xpThreshold = 100; // XP pour atteindre le niveau 2
  let accumulatedXP = 0;
  
  while (accumulatedXP + xpThreshold <= totalXP && level < 100) {
    accumulatedXP += xpThreshold;
    level++;
    xpThreshold = Math.floor(xpThreshold * 1.5); // Croissance exponentielle
  }
  
  return level;
}

/**
 * Calcule l'XP restant pour le prochain niveau
 */
export function getXPToNextLevel(totalXP) {
  let level = 1;
  let xpThreshold = 100;
  let accumulatedXP = 0;
  
  while (accumulatedXP + xpThreshold <= totalXP && level < 100) {
    accumulatedXP += xpThreshold;
    level++;
    xpThreshold = Math.floor(xpThreshold * 1.5);
  }
  
  const nextLevelXP = accumulatedXP + xpThreshold;
  const xpInCurrentLevel = totalXP - accumulatedXP;
  const xpToNextLevel = nextLevelXP - totalXP;
  
  return {
    currentLevel: level,
    xpInCurrentLevel,
    xpNeeded: xpThreshold,
    xpToNextLevel,
    progressPercent: Math.min(100, (xpInCurrentLevel / xpThreshold) * 100)
  };
}

/**
 * Système d'achievements
 */
export const ACHIEVEMENTS = {
  FIRST_BLOOD: {
    id: 'first_blood',
    name: 'Premier Sang',
    description: 'Terminer ta première partie',
    icon: '🎮',
    condition: (score, stage, timerSeconds) => score > 0
  },
  SPEED_RUNNER: {
    id: 'speed_runner',
    name: 'Coursier Rapide',
    description: 'Atteindre le stage 5 en moins de 20 secondes',
    icon: '⚡',
    condition: (score, stage, timerSeconds) => stage >= 5 && timerSeconds < 20
  },
  ENDURANCE: {
    id: 'endurance',
    name: 'Endurance',
    description: 'Survivre 60 secondes',
    icon: '💪',
    condition: (score, stage, timerSeconds) => timerSeconds >= 60
  },
  PERFECTIONIST: {
    id: 'perfectionist',
    name: 'Perfectionniste',
    description: 'Atteindre le stage 10',
    icon: '👑',
    condition: (score, stage, timerSeconds) => stage >= 10
  },
  SCORE_MASTER: {
    id: 'score_master',
    name: 'Maître du Score',
    description: 'Obtenir un score de 500 points',
    icon: '🏆',
    condition: (score, stage, timerSeconds) => score >= 500
  },
  LIGHT_SPEED: {
    id: 'light_speed',
    name: 'Vitesse Lumière',
    description: 'Atteindre le stage 20',
    icon: '🌟',
    condition: (score, stage, timerSeconds) => stage >= 20
  },
  MARATHON: {
    id: 'marathon',
    name: 'Marathon',
    description: 'Survivre 120 secondes',
    icon: '🏃',
    condition: (score, stage, timerSeconds) => timerSeconds >= 120
  }
};

/**
 * Détermine les achievements gagnés
 */
export function checkAchievements(finalScore, stage, timerSeconds, previousAchievements = []) {
  const newAchievements = [];
  
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    // Vérifier si l'achievement n'est pas déjà obtenu
    if (!previousAchievements.includes(achievement.id)) {
      if (achievement.condition(finalScore, stage, timerSeconds)) {
        newAchievements.push(achievement.id);
      }
    }
  });
  
  return newAchievements;
}

/**
 * Calcule un score de progression global (0-100)
 * Basé sur : XP, achievements, meilleur score
 */
export function calculateProgressionScore(totalXP, achievements, bestScore) {
  const level = getLevelFromXP(totalXP);
  const levelScore = Math.min(50, level * 2.5); // Max 50 points pour niveau 20
  const achievementScore = (achievements.length / Object.keys(ACHIEVEMENTS).length) * 30; // Max 30
  const scoreScore = Math.min(20, (bestScore / 1000) * 20); // Max 20
  
  return Math.floor(levelScore + achievementScore + scoreScore);
}
