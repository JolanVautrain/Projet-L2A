import { createContext, useContext, useState, useEffect } from 'react';
import fr from '../locales/fr.json';
import en from '../locales/en.json';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Charger la langue sauvegardée ou utiliser le navigateur
    const saved = localStorage.getItem('language');
    return saved || navigator.language.split('-')[0] || 'fr';
  });

  // Charger la langue depuis le backend si l'utilisateur est connecté
  useEffect(() => {
    const username = localStorage.getItem('user');
    if (!username) return;
    fetch(`/api/user/language/${username}`)
      .then((r) => r.ok ? r.json() : { language: language })
      .then((data) => {
        if (data && data.language) {
          setLanguage(data.language);
          localStorage.setItem('language', data.language);
        }
      })
      .catch(() => {});
  }, []);

  const translations = {
    fr,
    en,
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('language', lang);
      const username = localStorage.getItem('user');
      if (username) {
        fetch('/api/user/language', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, language: lang }),
        }).catch(() => {});
      }
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Retourner la clé si traduction non trouvée
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
