/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { getActiveUser } from "../utils/userSession.js";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Charger la langue sauvegardée ou utiliser le navigateur
    const saved = localStorage.getItem("language");
    return saved || navigator.language.split("-")[0] || "fr";
  });

  const [translations, setTranslations] = useState({ fr: {}, en: {} });

  // Charger les traductions au démarrage
  useEffect(() => {
    Promise.all([
      fetch("/locales/fr.json").then((r) => r.json()),
      fetch("/locales/en.json").then((r) => r.json()),
    ])
      .then(([fr, en]) => {
        setTranslations({ fr, en });
      })
      .catch((err) => console.error("Failed to load translations", err));
  }, []);

  // Charger la langue depuis le backend si l'utilisateur est connecté
  useEffect(() => {
    const username = getActiveUser();
    if (!username) return;
    fetch(`/api/user/language/${username}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (data?.language) {
          setLanguage(data.language);
          localStorage.setItem("language", data.language);
        }
      })
      .catch(() => {});
  }, []);

  const changeLanguage = useCallback(
    (lang) => {
      if (translations[lang] && Object.keys(translations[lang]).length > 0) {
        setLanguage(lang);
        localStorage.setItem("language", lang);
        const username = getActiveUser();
        if (username) {
          fetch("/api/user/language", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, language: lang }),
          }).catch(() => {});
        }
      }
    },
    [translations],
  );

  const t = useCallback(
    (key) => {
      const keys = key.split(".");
      let value = translations[language];

      for (const k of keys) {
        if (value && typeof value === "object") {
          value = value[k];
        } else {
          return key; // Retourner la clé si traduction non trouvée
        }
      }

      return typeof value === "string" ? value : key;
    },
    [translations, language],
  );

  const value = useMemo(
    () => ({ language, changeLanguage, t }),
    [language, changeLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

export function LanguageSelector() {
  const { language, changeLanguage, t } = useLanguage();

  return (
    <div className="language-selector">
      <h3 className="language-selector__title">{t("account.language")}</h3>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="language-selector__select"
      >
        <option value="fr">{t("languageNames.fr")}</option>
        <option value="en">{t("languageNames.en")}</option>
      </select>
    </div>
  );
}

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
