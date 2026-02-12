/**
 * Utilitaire pour construire l'URL de l'API
 * Utilisé pour résoudre dynamiquement l'adresse du backend
 */

export function getApiBaseUrl() {
  // Priorité 1: Variable d'environnement VITE_BACKEND_URL (définie au build time)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // Priorité 2: Construction dynamique basée sur window.location
  if (typeof globalThis !== 'undefined' && globalThis.location) {
    const protocol = globalThis.location.protocol; // http: ou https:
    const host = globalThis.location.hostname;
    const port = globalThis.location.port ? `:${globalThis.location.port}` : '';
    return `${protocol}//${host}${port}/api`;
  }

  // Fallback
  return 'http://localhost:5000/api';
}

import { getActiveSessionToken, getActiveUser } from "./userSession.js";

export function apiUrl(endpoint) {
  const base = getApiBaseUrl();
  // Enlever le /api du endpoint s'il le contient
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

export async function apiFetch(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  const sessionUser = getActiveUser();
  const sessionToken = getActiveSessionToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionUser && sessionToken
        ? {
            'X-Session-User': sessionUser,
            'X-Session-Token': sessionToken,
          }
        : {}),
      ...options.headers,
    },
  });
  return response;
}
