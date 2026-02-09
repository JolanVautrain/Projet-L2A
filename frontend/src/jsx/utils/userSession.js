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

export function getActiveSessionToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("sessionToken");
}

export function setActiveUser(value) {
  if (typeof window === "undefined") return;

  if (value) {
    sessionStorage.setItem("user", value);
  } else {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("sessionToken");
  }

  localStorage.removeItem("user");
}

export function setActiveSessionToken(value) {
  if (typeof window === "undefined") return;

  if (value) {
    sessionStorage.setItem("sessionToken", value);
  } else {
    sessionStorage.removeItem("sessionToken");
  }
}

export function getUserAchievementsKey(username) {
  return username ? `userAchievements:${username}` : "userAchievements";
}
