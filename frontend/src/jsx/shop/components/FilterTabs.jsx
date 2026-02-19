import PropTypes from "prop-types";

// Composant de filtres sous forme d'onglets pour la page du shop
export function FilterTabs({ activeTab, onTabChange, categories }) {
  return (
    <div className="filter-tabs-container">
      <div className="filter-tabs">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`filter-tab ${activeTab === category.id ? "active" : ""}`}
            onClick={() => onTabChange(category.id)}
          >
            <span className="tab-icon">{category.icon}</span>
            <span className="tab-label">{category.label}</span>
            {category.count > 0 && (
              <span className="tab-count">{category.count}</span>
            )}
          </button>
        ))}
      </div>
      <div
        className="filter-underline"
        style={{
          width: `calc(100% / ${categories.length})`,
          left: `calc(${categories.findIndex((c) => c.id === activeTab)} * 100% / ${categories.length})`,
        }}
      />
    </div>
  );
}

FilterTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    }),
  ).isRequired,
};
