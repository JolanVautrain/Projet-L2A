/**
 * Système de prédiction client-side pour le multijoueur
 * 
 * Architecture:
 * - Client calcule et applique localement
 * - Envoie input au serveur avec numéro de séquence
 * - Serveur valide et envoie corrections si nécessaire
 * - Réduit drastiquement la latence et charge serveur
 */

class GameClientPrediction {
  constructor() {
    // Compteur des actions pour traçabilité
    this.sequenceNumber = 0;
    
    // Actions en attente de confirmation du serveur
    this.pendingActions = [];
    
    // État local du joueur
    this.localPlayerState = {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      jumping: false,
      grounded: false,
    };
    
    // État confirmé par le serveur
    this.serverState = {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      jumping: false,
      grounded: false,
      lastSequence: -1,
    };
    
    // États adversaires (reçus du serveur)
    this.opponentStates = new Map(); // username -> state
    
    // Seuil de correction avant rollback (pixels)
    this.CORRECTION_THRESHOLD = 50;
    
    // Timeout avant considérer l'action comme confirmée (ms)
    this.ACTION_TIMEOUT = 5000;
  }

  /**
   * Redémarrer la prédiction
   */
  reset() {
    this.sequenceNumber = 0;
    this.pendingActions = [];
    this.localPlayerState = {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      jumping: false,
      grounded: false,
    };
    this.serverState = {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      jumping: false,
      grounded: false,
      lastSequence: -1,
    };
    this.opponentStates.clear();
  }

  /**
   * Envoyer un input client + appliquer localement
   * @param {string} inputType - "JUMP", "MOVE_LEFT", "MOVE_RIGHT"
   * @param {Object} currentPlayerState - État actuel du joueur
   * @param {Function} applyAction - Fonction pour appliquer l'action au joueur
   * @param {WebSocket} ws - Socket WebSocket
   * @param {string} username - Nom d'utilisateur
   * @param {string|null} matchId - Identifiant de partie multijoueur
   */
  sendInputWithPrediction(
    inputType,
    currentPlayerState,
    applyAction,
    ws,
    username,
    matchId
  ) {
    this.sequenceNumber++;
    const sequence = this.sequenceNumber;
    
    // Appliquer l'action IMMÉDIATEMENT côté client (prédiction)
    applyAction(inputType, currentPlayerState);
    
    // Mettre à jour l'état local
    this.updateLocalState(currentPlayerState);
    
    // Créer l'action en attente
    const action = {
      sequence,
      type: inputType,
      timestamp: Date.now(),
      clientState: { ...currentPlayerState },
    };
    
    this.pendingActions.push(action);
    
    // Envoyer au serveur avec le numéro de séquence
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "input",
          matchId,
          username,
          input: inputType,
          sequence, // Numéro pour traçabilité
          clientTimestamp: Date.now(),
        })
      );
    }
    
    // Nettoyer les actions trop anciennes
    this.cleanupOldActions();
  }

  /**
   * Traiter une correction du serveur
   * @param {Object} correction - { sequence, x, y, velocityX, velocityY, valid }
   * @param {Object} player - Objet Phaser du joueur
   * @param {Function} replayActions - Fonction pour rejouer les actions
   */
  processServerCorrection(correction, player, replayActions) {
    const { sequence, x, y, velocityX, velocityY, valid } = correction;
    
    if (!valid) {
      // Le serveur détecte une fraude/incohérence - ROLLBACK
      console.warn(`[!] Correction du serveur: tentative de fraude détectée (seq: ${sequence})`);
      this.rollback(sequence, { x, y, velocityX, velocityY }, player);
      return;
    }
    
    // Vérifier la distance entre prédiction et réalité
    const distanceX = Math.abs(this.localPlayerState.x - x);
    const distanceY = Math.abs(this.localPlayerState.y - y);
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    if (distance > this.CORRECTION_THRESHOLD) {
      console.warn(`[!] Désynchronisation détectée (distance: ${distance}px) - Correction`);
      this.rollback(sequence, { x, y, velocityX, velocityY }, player, replayActions);
      return;
    }
    
    // Confirmation normale
    this.confirmAction(sequence);
    this.serverState = {
      x,
      y,
      velocityX,
      velocityY,
      lastSequence: sequence,
    };
  }

  /**
   * Confirmer une action (elle a été acceptée par le serveur)
   */
  confirmAction(sequence) {
    this.pendingActions = this.pendingActions.filter(a => a.sequence > sequence);
  }

  /**
   * Rollback: restaurer l'état serveur et rejouer les actions
   */
  rollback(failedSequence, serverState, player, replayActions) {
    // Restaurer l'état serveur dans le joueur Phaser
    if (player) {
      player.x = serverState.x;
      player.y = serverState.y;
      player.setVelocity(serverState.velocityX, serverState.velocityY);
    }
    
    // Réinitialiser les actions
    const actionsToReplay = this.pendingActions.filter(
      a => a.sequence > failedSequence
    );
    
    this.pendingActions = [];
    
    // Rejouer les actions valides
    if (replayActions && actionsToReplay.length > 0) {
      actionsToReplay.forEach(action => {
        replayActions(action.type);
        this.pendingActions.push(action);
      });
    }
  }

  /**
   * Mettre à jour l'état local du joueur
   */
  updateLocalState(playerState) {
    this.localPlayerState = {
      x: playerState.x,
      y: playerState.y,
      velocityX: playerState.velocityX,
      velocityY: playerState.velocityY,
      jumping: playerState.jumping || false,
      grounded: playerState.grounded || false,
    };
  }

  /**
   * Mettre à jour l'état d'un adversaire (reçu du serveur)
   */
  updateOpponentState(username, state) {
    this.opponentStates.set(username, {
      x: state.x,
      y: state.y,
      velocityX: state.velocityX,
      velocityY: state.velocityY,
      jumping: state.jumping || false,
      grounded: state.grounded || false,
      lastUpdate: Date.now(),
    });
  }

  /**
   * Obtenir l'état d'un adversaire
   */
  getOpponentState(username) {
    return this.opponentStates.get(username) || null;
  }

  /**
   * Nettoyer les actions trop anciennes
   */
  cleanupOldActions() {
    const now = Date.now();
    this.pendingActions = this.pendingActions.filter(
      action => now - action.timestamp < this.ACTION_TIMEOUT
    );
  }

  /**
   * Obtenir le nombre d'actions en attente
   */
  getPendingActionCount() {
    return this.pendingActions.length;
  }

  /**
   * Interpoler la position d'un adversaire (lissage)
   */
  interpolateOpponentPosition(username, player, deltaTime = 16) {
    const state = this.getOpponentState(username);
    if (!state || !player) return;
    
    // Interpolation linéaire vers la position cible
    const speed = 200; // pixels/seconde
    const maxDelta = speed * (deltaTime / 1000);
    
    const dx = state.x - player.x;
    const dy = state.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > maxDelta) {
      const ratio = maxDelta / distance;
      player.x += dx * ratio;
      player.y += dy * ratio;
    } else {
      player.x = state.x;
      player.y = state.y;
    }
    
    // Mettre à jour la vélocité
    player.setVelocity(state.velocityX, state.velocityY);
  }

  /**
   * Obtenir les statistiques de prédiction
   */
  getStats() {
    return {
      sequenceNumber: this.sequenceNumber,
      pendingActions: this.pendingActions.length,
      opponentCount: this.opponentStates.size,
      localState: { ...this.localPlayerState },
      serverState: { ...this.serverState },
    };
  }

  /**
   * Vérifier si une action est en conflit avec le serveur
   */
  hasConflict(sequence) {
    return !this.pendingActions.some(a => a.sequence <= sequence);
  }
}

export default GameClientPrediction;
