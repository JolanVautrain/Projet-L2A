import PropTypes from "prop-types";
import ReportModal from "../autres/report.jsx";
import { useState } from "react";
import { useLanguage } from "../autres/Language.jsx";

// Règles du jeu
function RulesCard({ rule }) {
  return (
    <div className="rules-card">
      <h3>{rule.name}</h3>
      <p>{rule.content}</p>
    </div>
  );
}

// PropTypes pour la validation des props de RulesCard
RulesCard.propTypes = {
  rule: PropTypes.shape({
    name: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }).isRequired,
};

// Page des règles du jeu
function Regle() {
  const { t } = useLanguage();

  const rules = [
    {
      name: t("rules.rule1.name"),
      content: t("rules.rule1.content"),
    },

    {
      name: t("rules.rule2.name"),
      content: t("rules.rule2.content"),
    },

    {
      name: t("rules.rule3.name"),
      content: t("rules.rule3.content"),
    },

    {
      name: t("rules.rule4.name"),
      content: t("rules.rule4.content"),
    },

    {
      name: t("rules.rule5.name"),
      content: t("rules.rule5.content"),
    },

    {
      name: t("rules.rule6.name"),
      content: t("rules.rule6.content"),
    },

    {
      name: t("rules.rule7.name"),
      content: t("rules.rule7.content"),
    },

    {
      name: t("rules.rule8.name"),
      content: t("rules.rule8.content"),
    },

    {
      name: t("rules.rule9.name"),
      content: t("rules.rule9.content"),
    },
  ];

  // État pour gérer l'ouverture du modal de signalement
  const [isReportOpen, setIsReportOpen] = useState(false);

  const reportForm = () => {
    setIsReportOpen(true);
  };

  // Mise en page des règles et du bouton de signalement
  return (
    <div className="regle-container">
      <div className="rules-container">
        <h2>{t("rules.title")}</h2>
        {rules.map((rule) => (
          <RulesCard key={rule.name} rule={rule} />
        ))}
      </div>
      <div className="report-container">
        <button className="btn primary" onClick={reportForm}>
          {t("report.button")}
        </button>
      </div>
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}

export default Regle;
