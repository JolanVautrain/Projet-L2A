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
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol; // http: ou https:
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${host}${port}/api`;
  }

  // Fallback
  return 'http://localhost:5000/api';
}

export function apiUrl(endpoint) {
  const base = getApiBaseUrl();
  // Enlever le /api du endpoint s'il le contient
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

export async function apiFetch(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}
