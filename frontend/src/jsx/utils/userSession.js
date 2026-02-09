export function getActiveUser() {
  if (typeof window === "undefined") return null;

  const sessionUser = sessionStorage.getItem("user");
  if (sessionUser) return sessionUser;

  const legacyUser = localStorage.getItem("user");
  if (legacyUser) {
    sessionStorage.setItem("user", legacyUser);
    localStorage.removeItem("user");
    return legacyUser;
  }

  return null;
}

export function setActiveUser(value) {
  if (typeof window === "undefined") return;

  if (value) {
    sessionStorage.setItem("user", value);
  } else {
    sessionStorage.removeItem("user");
  }

  localStorage.removeItem("user");
}

export function getUserAchievementsKey(username) {
  return username ? `userAchievements:${username}` : "userAchievements";
}
