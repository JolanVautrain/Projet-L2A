/**
 * Utilitaire pour construire l'URL WebSocket
  * Construit dynamiquement l'URL basée sur window.location
 */

export function getWebSocketUrl() {
  // Priorité 1: Variable d'environnement (si définie au build)
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // Priorité 2: Construction dynamique basée sur window.location
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    // Utiliser le chemin /ws qui est proxifié par Nginx
    return `${protocol}//${host}${port}/ws`;
  }

  // Fallback
  return 'ws://localhost:3001';
}
