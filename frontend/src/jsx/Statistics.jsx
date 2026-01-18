import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import "../css/Statistics.css";
import { useLanguage } from "./Language.jsx";

function Statistics({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();
  useEffect(() => {
    if (!user) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    let mounted = true;
    fetch(`/api/user/stats/${user}`)
      .then((r) => {
        if (!r.ok) throw new Error(t("statistics.fetchFailed"));
        return r.json();
      })
      .then((data) => {
        if (mounted) {
          setStats(data);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user, t]);
  if (!user) return <p>{t("statistics.loginToViewStats")}</p>;
  if (loading) return <p>{t("common.loading")}</p>;
  if (error) return <p>{t("common.error")}: {error}</p>;
  if (!stats) return <p>{t("common.noData")}</p>;
  const formatTime = (seconds) => {
    if (seconds === 0) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  return (
    <div className="statistics">
      <h2>{t("statistics.title")}</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{t("statistics.totalGames")}</div>
          <div className="stat-value">{stats.totalGames}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("statistics.totalPlayTime")}</div>
          <div className="stat-value">{formatTime(stats.totalPlayTime)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("statistics.totalScore")}</div>
          <div className="stat-value">{stats.totalScore}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("statistics.averageScore")}</div>
          <div className="stat-value">{stats.averageScore.toFixed(1)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("statistics.bestScore")}</div>
          <div className="stat-value highlight">{stats.bestScore}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("statistics.averageStage")}</div>
          <div className="stat-value">{stats.averageStage.toFixed(1)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("statistics.highestStage")}</div>
          <div className="stat-value highlight">{stats.highestStage}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("statistics.averagePlayTime")}</div>
          <div className="stat-value">{formatTime(Math.round(stats.averagePlayTime))}</div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;

Statistics.propTypes = {
  user: PropTypes.string,
};
