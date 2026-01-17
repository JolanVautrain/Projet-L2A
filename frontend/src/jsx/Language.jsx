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

export function LanguageSelector() {
  try {
    const { language, changeLanguage, t } = useLanguage();

    return (
      <div
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          backgroundColor: "rgba(79,158,246,0.05)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>🌐 {t('account.language')}</h3>
        <select 
          value={language} 
          onChange={(e) => changeLanguage(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid rgba(79, 158, 246, 0.3)',
            backgroundColor: '#1a2849',
            color: '#e6eef8',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
    );
  } catch (e) {
    console.error("LanguageSelector error:", e);
    return null;
  }
}

export default LanguageSelector;
