import { useEffect, useState } from 'react';

const PURCHASED_ITEMS_KEY = 'purchasedItems';
const ACTIVE_ITEMS_KEY = 'activeItems';

export function useBombPack(username) {
    const [hasActiveBombPack, setHasActiveBombPack] = useState(() => {
        if (!username) return false;
        const activeItems = localStorage.getItem(`${ACTIVE_ITEMS_KEY}:${username}`);
        const active = activeItems ? JSON.parse(activeItems) : [];
        return active.includes('bomb-icon');
    });

    const [purchasedItems, setPurchasedItemsState] = useState(() => {
        if (!username) return [];
        const stored = localStorage.getItem(`${PURCHASED_ITEMS_KEY}:${username}`);
        return stored ? JSON.parse(stored) : [];
    });

    const [activeItems, setActiveItems] = useState(() => {
        if (!username) return [];
        const activeStorageItems = localStorage.getItem(`${ACTIVE_ITEMS_KEY}:${username}`);
        return activeStorageItems ? JSON.parse(activeStorageItems) : [];
    });

    // Synchroniser quand username change
    useEffect(() => {
        if (!username) return;

        const stored = localStorage.getItem(`${PURCHASED_ITEMS_KEY}:${username}`);
        const items = stored ? JSON.parse(stored) : [];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPurchasedItemsState(items);

        const activeItemsStorageValue = localStorage.getItem(`${ACTIVE_ITEMS_KEY}:${username}`);
        const active = activeItemsStorageValue ? JSON.parse(activeItemsStorageValue) : [];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveItems(active);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasActiveBombPack(active.includes('bomb-icon'));
    }, [username]);

    // Écouter les changements du localStorage (depuis d'autres onglets/contextes)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (!username) return;

            if (e.key === `${ACTIVE_ITEMS_KEY}:${username}`) {
                const newValue = e.newValue;
                const active = newValue ? JSON.parse(newValue) : [];
                setActiveItems(active);
                setHasActiveBombPack(active.includes('bomb-icon'));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [username]);

    // Écouter les événements personnalisés pour les changements de bomb pack
    useEffect(() => {
        const handleBombPackChanged = (e) => {
            if (!username) return;
            if (e?.detail?.username && e.detail.username !== username) return;
            const storedActive = localStorage.getItem(`${ACTIVE_ITEMS_KEY}:${username}`);
            const active = storedActive ? JSON.parse(storedActive) : [];
            setActiveItems(active);
            setHasActiveBombPack(active.includes('bomb-icon'));
        };

        window.addEventListener('bombPackChanged', handleBombPackChanged);
        return () => window.removeEventListener('bombPackChanged', handleBombPackChanged);
    }, [username]);

    const purchaseItem = (itemId) => {
        if (username && !purchasedItems.includes(itemId)) {
            const updated = [...purchasedItems, itemId];
            setPurchasedItemsState(updated);
            localStorage.setItem(
                `${PURCHASED_ITEMS_KEY}:${username}`,
                JSON.stringify(updated)
            );
        }
    };

    // Activer un item (ajouter à activeItems) dans l'inventaire
    const activateItem = (itemId) => {
        if (username) {
            const activeItems = localStorage.getItem(`${ACTIVE_ITEMS_KEY}:${username}`);
            const active = activeItems ? JSON.parse(activeItems) : [];

            if (!active.includes(itemId)) {
                active.push(itemId);
                localStorage.setItem(`${ACTIVE_ITEMS_KEY}:${username}`, JSON.stringify(active));
            }

            setActiveItems(active);
            window.dispatchEvent(
                new CustomEvent('bombPackChanged', { detail: { username } })
            );

            if (itemId === 'bomb-icon') {
                setHasActiveBombPack(true);
            }
        }
    };

    // Désactiver un item (le retirer des actifs) dans l'inventaire
    const deactivateItem = (itemId) => {
        if (username) {
            const activeItems = localStorage.getItem(`${ACTIVE_ITEMS_KEY}:${username}`);
            const active = activeItems ? JSON.parse(activeItems) : [];

            const updated = active.filter(id => id !== itemId);
            localStorage.setItem(`${ACTIVE_ITEMS_KEY}:${username}`, JSON.stringify(updated));
            setActiveItems(updated);
            window.dispatchEvent(
                new CustomEvent('bombPackChanged', { detail: { username } })
            );

            if (itemId === 'bomb-icon') {
                setHasActiveBombPack(false);
            }
        }
    };

    return {
        hasActiveBombPack,
        activeItems,
        purchasedItems,
        purchaseItem,
        activateItem,
        deactivateItem,
    };
}
