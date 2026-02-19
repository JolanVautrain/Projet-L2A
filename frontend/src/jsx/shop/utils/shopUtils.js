export const parsePrice = (s) => {
  if (s == null) return 0;
  const cleaned = String(s).replace('€', '').replace(/\s/g, '').replace(',', '.');
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

export const formatPrice = (n) => {
  return n.toFixed(2).replace('.', ',') + '€';
};

// Convertit un nombre de secondes en format HH:MM:SS pour les alertes de temps restant
export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
};

// Mise à jour des prix avec l'augmentation des prix
export const applyPriceMultiplier = (product, multiplier, t) => {
  const basePrice = parsePrice(product.price);
  const scaledPrice = basePrice * multiplier;
  const price = formatPrice(scaledPrice);
  const oldPrice = product.oldPrice ? formatPrice(parsePrice(product.oldPrice) * multiplier) : undefined;

  return {
    ...product,
    title: t(product.titleKey),
    desc: t(product.descKey),
    price,
    oldPrice,
  };
};

// Coûts supplémentaires pour les options dans le modal
export const EXTRA_COSTS = {
  delivery: { name: 'delivery', price: 1.99 },
  express: { name: 'express', price: 4.99 },
  giftWrap: { name: 'giftWrap', price: 2.49 },
  support: { name: 'support', price: 3.99 },
  warranty: { name: 'warranty', price: 5.99 },
  insurance: { name: 'insurance', price: 2.99 },
};

export const calculateModalTotal = (basePrice, extras) => {
  let total = basePrice;
  Object.entries(extras).forEach(([key, isChecked]) => {
    if (isChecked && EXTRA_COSTS[key]) {
      total += EXTRA_COSTS[key].price;
    }
  });
  return total.toFixed(2) + '€';
};

// Génère des notifications aléatoires pour les tests
export const FAKE_NOTIFICATIONS = [
  (names) => `${names[Math.floor(Math.random() * names.length)]} vient d'acheter un article !`,
  () => `⚡ Plus que ${Math.floor(Math.random() * 5) + 1} articles en stock !`,
  (names) => `${names[Math.floor(Math.random() * names.length)]} a ouvert une lootbox rare !`,
  () => `🔥 ${Math.floor(Math.random() * 20) + 5} personnes regardent cette page`,
  (names) => `🎉 ${names[Math.floor(Math.random() * names.length)]} a obtenu un super prix !`,
  () => `⏰ Offre spéciale terminant dans ${Math.floor(Math.random() * 10) + 1} minutes !`,
  (names) => `${names[Math.floor(Math.random() * names.length)]} a ajouté un article au panier !`,
  () => `🚀 ${Math.floor(Math.random() * 10) + 1} personnes viennent d'acheter cet article !`,
  (names) => `💥 ${names[Math.floor(Math.random() * names.length)]} a obtenu un prix épique !`,
  () => `⚠️ Attention, il ne reste que ${Math.floor(Math.random() * 3) + 1} articles en stock !`,
  (names) => `🎁 ${names[Math.floor(Math.random() * names.length)]} a acheté une lootbox !`,
  () => `🔥 ${Math.floor(Math.random() * 30) + 10} personnes regardent cet article !`,
  () => `⏳ Offre spéciale terminant dans ${Math.floor(Math.random() * 5) + 1} minutes !`,
  (names) => `${names[Math.floor(Math.random() * names.length)]} a obtenu un prix légendaire !`,
  () => `🚨 ${Math.floor(Math.random() * 5) + 1} personnes viennent d'acheter cet article !`,
  () => `⚡ Plus que ${Math.floor(Math.random() * 3) + 1} articles en stock !`,
];

// Génère des noms aléatoires pour les notifications
export const FAKE_NAMES = ['Ethan', 'Jolan', 'Gabriel', 'Lalo', 'Yasser', 'Ewen', 'Pierre', 'Seven', 'Martin', 'Camille', 'Khadija', 'Donatien', 'Dylan', 'Adnane', 'Sofian'];
