import { useLanguage } from "./useLanguage.jsx";

function LanguageSelector() {
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
