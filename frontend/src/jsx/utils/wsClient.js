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
    const devPorts = new Set(['5173', '4173']);
    const envPort = import.meta.env.VITE_WS_PORT;
    const portValue = envPort
      ? String(envPort)
      : window.location.port && !devPorts.has(window.location.port)
        ? window.location.port
        : '3001';
    const port = portValue ? `:${portValue}` : '';
    const path = import.meta.env.VITE_WS_PATH || '';
    return `${protocol}//${host}${port}${path}`;
  }

  // Fallback
  return 'ws://localhost:3001';
}
