import PropTypes from "prop-types";
import { useLanguage } from "../autres/Language.jsx";


// Règles du jeu
function RulesCard({ rule }) {
    return(

        <div className="rules-card">
            <h3>{rule.name}</h3>
            <p>{rule.content}</p>
        </div>
    )
}

// 
RulesCard.propTypes = {
    rule : PropTypes.shape({
        name : PropTypes.string.isRequired,
        content : PropTypes.string.isRequired
    }).isRequired
}

// 
function Regle() {
    const { t } = useLanguage();

    const rules = [
    {
        name : t("rules.rule1.name"),
        content : t("rules.rule1.content")
    },

    {
        name : t("rules.rule2.name"),
        content : t("rules.rule2.content")
    },

    {
        name : t("rules.rule3.name"),
        content : t("rules.rule3.content")
    },

     {
        name : t("rules.rule4.name"),
        content : t("rules.rule4.content")
    },

     {
        name : t("rules.rule5.name"),
        content : t("rules.rule5.content")
    },

     {
        name : t("rules.rule6.name"),
        content : t("rules.rule6.content")
    },

     {
        name : t("rules.rule7.name"),
        content : t("rules.rule7.content")
    },

     {
        name : t("rules.rule8.name"),
        content : t("rules.rule8.content")
    },

     {
        name : t("rules.rule9.name"),
        content : t("rules.rule9.content")
    },

]
    return (
        
        <div className="rules-container">
            <h2>{t("rules.title")}</h2>
            <h3>{t("rules.intro")}</h3>
            {rules.map((rule) => (
                <RulesCard key={rule.name} rule={rule} />
            ))}
        </div>
    )
}

export default Regle;