import { useEffect, useState } from 'react';

const PURCHASED_SKINS_KEY = 'purchasedSkins';
const ACTIVE_SKIN_KEY = 'activeSkin';

export function useSkins(username) {
    const [activeSkin, setActiveSkinState] = useState(null);
    const [purchasedSkins, setPurchasedSkinsState] = useState([]);

    // Initialiser au montage du composant
    useEffect(() => {
        if (username) {
            const stored = localStorage.getItem(`${PURCHASED_SKINS_KEY}:${username}`);
            const skins = stored ? JSON.parse(stored) : [];
            setPurchasedSkinsState(skins);

            const active = localStorage.getItem(`${ACTIVE_SKIN_KEY}:${username}`);
            setActiveSkinState(active);

            // Appliquer le skin actif
            applyNeonSkinToDOM(active);
        }
    }, [username]);

    // Écouter les changements du localStorage (depuis d'autres onglets/contextes)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (!username) return;

            if (e.key === `${ACTIVE_SKIN_KEY}:${username}`) {
                const newValue = e.newValue;
                setActiveSkinState(newValue);
                applyNeonSkinToDOM(newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [username]);

    const purchaseSkin = (skinId) => {
        if (username && !purchasedSkins.includes(skinId)) {
            const updated = [...purchasedSkins, skinId];
            setPurchasedSkinsState(updated);
            localStorage.setItem(
                `${PURCHASED_SKINS_KEY}:${username}`,
                JSON.stringify(updated)
            );
        }
    };

    const activateSkin = (skinId) => {
        if (username) {
            setActiveSkinState(skinId);
            localStorage.setItem(`${ACTIVE_SKIN_KEY}:${username}`, skinId);
            applyNeonSkinToDOM(skinId);
        }
    };

    const deactivateSkin = () => {
        if (username) {
            setActiveSkinState(null);
            localStorage.removeItem(`${ACTIVE_SKIN_KEY}:${username}`);
            applyNeonSkinToDOM(null);
        }
    };

    return {
        activeSkin,
        purchasedSkins,
        purchaseSkin,
        activateSkin,
        deactivateSkin,
    };
}

// Fonction pour appliquer ou retirer la classe CSS du skin néon
function applyNeonSkinToDOM(skinId) {
    const html = document.documentElement;

    if (skinId === 'skin-neo') {
        html.classList.add('neon-skin-active');
    } else {
        html.classList.remove('neon-skin-active');
    }
}

