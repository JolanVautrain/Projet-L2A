import { useEffect, useState } from 'react';

const PURCHASED_ITEMS_KEY = 'purchasedItems';
const ACTIVE_ITEMS_KEY = 'activeItems';

export function useBombPack(username) {
    const [hasActiveBombPack, setHasActiveBombPack] = useState(false);
    const [purchasedItems, setPurchasedItemsState] = useState([]);
    const [activeItems, setActiveItems] = useState([]);

    // Initialiser au montage du composant
    useEffect(() => {
        if (username) {
            const stored = localStorage.getItem(`${PURCHASED_ITEMS_KEY}:${username}`);
            const items = stored ? JSON.parse(stored) : [];
            setPurchasedItemsState(items);

            const activeItems = localStorage.getItem(`${ACTIVE_ITEMS_KEY}:${username}`);
            const active = activeItems ? JSON.parse(activeItems) : [];
            setActiveItems(active);
            setHasActiveBombPack(active.includes('bomb-icon'));
        }
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
