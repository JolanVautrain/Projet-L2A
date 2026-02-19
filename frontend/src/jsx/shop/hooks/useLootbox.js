import { useState, useEffect, useRef } from 'react';

export function useLootbox() {
  const [lootOpen, setLootOpen] = useState(false);
  const [lootProduct, setLootProduct] = useState(null);
  const [lootPrize, setLootPrize] = useState(null);
  const [lootWaiting, setLootWaiting] = useState(false);
  const [lootCountdown, setLootCountdown] = useState(0);
  const audioRef = useRef(null);

  // Créer l'élément audio au montage du hook
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      document.body.appendChild(audio);
      audioRef.current = audio;
    }
  }, []);

  // Nettoyer l'élément audio à la destruction du hook
  const openLootbox = (product, lootboxRewards, possibleProducts, waitTime = 3) => {
    setLootProduct(product);
    setLootOpen(true);
    setLootPrize(null);
    setLootWaiting(true);
    setLootCountdown(waitTime);

    const possibleRewards = lootboxRewards[product.id] || [];
    const totalWeight = possibleRewards.reduce((sum, reward) => sum + reward.weight, 0);

    let random = Math.random() * totalWeight;
    let selectedReward = null;

    for (const reward of possibleRewards) {
      random -= reward.weight;
      if (random <= 0) {
        selectedReward = reward;
        break;
      }
    }

    const rewardId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let choice;
    if (!selectedReward || selectedReward.productId === null) {
      choice = {
        rewardId,
        name: 'Rien',
        img: '/assets/bomb.png',
        rarity: 'none',
        productId: null,
      };
    } else {
      const foundProduct = possibleProducts.find(prod => prod.id === selectedReward.productId);
      choice = foundProduct ? {
        rewardId,
        name: foundProduct.title,
        img: foundProduct.img,
        rarity: selectedReward.rarity,
        productId: foundProduct.id,
      } : {
        rewardId,
        name: 'Rien',
        img: '/assets/bomb.png',
        rarity: 'none',
        productId: null,
      };
    }

    // Jouer la musique en fonction de la rareté du gain
    const musicMap = {
      'none': null,
      'common': '/assets/sound/victory_commun.mp3',
      'rare': '/assets/sound/victory_rare.mp3',
      'epic': '/assets/sound/victory_long.mp3',
    };

    const musicPath = musicMap[choice.rarity];
    if (musicPath && audioRef.current) {
      try {
        audioRef.current.src = musicPath;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.warn('Audio play error:', err));
      } catch (err) {
        console.error('Failed to play audio:', err);
      }
    }

    let timeLeft = waitTime;
    const countdownInterval = setInterval(() => {
      timeLeft -= 1;
      setLootCountdown(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        setLootWaiting(false);
        setLootPrize({ batchId: rewardId, items: [choice] });
      }
    }, 1000);
  };

  // Ouvrir une lootbox avec plusieurs récompenses (ex: pack de cartes)
  const openLootboxBatch = (product, items, waitTime = 3) => {
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLootProduct(product);
    setLootOpen(true);
    setLootPrize(null);
    setLootWaiting(true);
    setLootCountdown(waitTime);

    const rarityRank = { none: 0, common: 1, rare: 2, epic: 3 };
    const bestRarity = items.reduce((best, item) => {
      const current = rarityRank[item.rarity] ?? 0;
      const bestRank = rarityRank[best] ?? 0;
      return current > bestRank ? item.rarity : best;
    }, 'none');

    const musicMap = {
      'none': null,
      'common': '/assets/sound/victory_commun.mp3',
      'rare': '/assets/sound/victory_rare.mp3',
      'epic': '/assets/sound/victory_long.mp3',
    };

    const musicPath = musicMap[bestRarity];
    if (musicPath && audioRef.current) {
      try {
        audioRef.current.src = musicPath;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.warn('Audio play error:', err));
      } catch (err) {
        console.error('Failed to play audio:', err);
      }
    }

    let timeLeft = waitTime;
    const countdownInterval = setInterval(() => {
      timeLeft -= 1;
      setLootCountdown(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        setLootWaiting(false);
        setLootPrize({ batchId, items });
      }
    }, 1000);
  };

  // Fermer la lootbox et réinitialiser l'état
  const closeLootbox = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setLootOpen(false);
    setLootPrize(null);
    setLootProduct(null);
    setLootWaiting(false);
    setLootCountdown(0);
  };

  return {
    lootOpen,
    lootProduct,
    lootPrize,
    lootWaiting,
    lootCountdown,
    audioRef,
    openLootbox,
    openLootboxBatch,
    closeLootbox,
  };
}
