import PropTypes from "prop-types";
import { useLanguage } from "./Language.jsx";

const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const text = formData.get("text");
    console.log("Text submitted:", text);
};



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
    }];

    const report = {
        title : t("report.title"),
        desc : t("report.desc"),
        text : t("report.text"),
    };

const reportForm = (
      <form id="report-form" onSubmit={handleSubmit}>
        <label htmlFor="input-name">
          '{t("report.desc")}'
          <input
            type="text"
            name="input-name"
            placeholder="bob"
            inputMode="text"
            pattern="[a-zA-Z0-9]+"
            required
          />
        </label>
        <label htmlFor="input-text">
          {t("report.text")}
          <textarea
            name="input-text"
            placeholder={t("report.textPlaceholder")}
            required
          />
        </label>


        <button type="submit" className="btn primary">
          {t("report.submit") || "Submit"}
        </button>
      </form>
    );

    
    return (
        <div className="regle-container">    
            <div className="rules-container">
                <h2>{t("rules.title")}</h2>
                {rules.map((rule) => (
                    <RulesCard key={rule.name} rule={rule} />
                ))}
            </div>

            <div className="report-container">
                <div className="report-section">
                    {reportForm}
                    <p className="report-section__desc">
                    {t("report.title") }
                </p>
                </div>
            </div>
        </div>
    )
}

export default Regle;