import PropTypes from "prop-types";
import { useLanguage } from "./Language.jsx";

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
        name : "regle 1 ",
        content : "ceci est la regle 1"
    },

    {
        name : "regle 2 ",
        content : "ceci est la regle 2"
    },

    {
        name : "regle 3 ",
        content : "ceci est la regle 3"
    }
]
    return (
        
        <div className="rules-container">
            <h2>{t("rules.title")}</h2>
            {rules.map((rule, index) => (
                <RulesCard key={index} rule={rule} />
            ))}
        </div>
    )
}

export default Regle;