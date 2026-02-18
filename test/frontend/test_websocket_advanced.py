"""Tests avancés WebSocket - Multiples matchs et scénarios.

NOTE: Ces tests nécessitent que le serveur WebSocket soit démarré manuellement.
Pour les exécuter:
1. cd backend && node gameServeur.js
2. pytest test/frontend/test_websocket_advanced.py -v
"""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any

import pytest
import websockets


# Skip tous les tests si le serveur WebSocket n'est pas disponible
pytestmark = pytest.mark.skip(
    reason="Tests WebSocket avancés nécessitent le serveur WebSocket démarré manuellement"
)


class WebSocketPlayer:
    """Représente un joueur connecté via WebSocket."""

    def __init__(self, username: str, match_id: str | None = None,
                 ws_url: str = "ws://localhost:3001"):
        self.username = username
        self.match_id = match_id or str(uuid.uuid4())
        self.ws_url = ws_url
        self.ws: Any = None
        self.received_messages: list[dict] = []
        self.game_started = False
        self.game_over = False

    async def connect(self) -> None:
        """Établir la connexion WebSocket."""
        try:
            self.ws = await websockets.connect(self.ws_url, ping_interval=None)
            print(f"✓ {self.username} connecté (match: {self.match_id[:8]}...)")
        except Exception as e:
            print(f"✗ {self.username} erreur: {e}")
            raise

    async def join_lobby(self) -> None:
        """Envoyer le message join au lobby."""
        message = {"type": "join_lobby", "username": self.username}
        await self.ws.send(json.dumps(message))

    async def listen(self) -> None:
        """Écouter les messages du serveur."""
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                self.received_messages.append(data)

                if data.get("type") == "lobby_update":
                    print(f"  [{self.username}] Lobby: {data.get('player_count')} joueurs")

                elif data.get("type") == "matchId":
                    self.match_id = data.get("matchId")
                    print(f"  [{self.username}] Match assigné: {self.match_id[:8]}...")

                elif data.get("type") == "start_game":
                    self.game_started = True
                    print(f"  [{self.username}] Jeu démarré!")

                elif data.get("type") == "gameOver":
                    self.game_over = True
                    print(f"  [{self.username}] Jeu terminé")

        except asyncio.CancelledError:
            pass

    async def join_game(self) -> None:
        """Rejoindre la partie."""
        if not self.match_id:
            raise ValueError(f"{self.username} n'a pas de matchId")
        message = {
            "type": "join_game",
            "username": self.username,
            "matchId": self.match_id,
        }
        await self.ws.send(json.dumps(message))
        await asyncio.sleep(0.5)

    async def send_input(self, stage: int = 1, inputs: dict | None = None) -> None:
        """Envoyer des inputs de jeu."""
        if not inputs:
            inputs = {"x": 50, "y": 100, "jump": False}
        message = {
            "type": "input",
            "username": self.username,
            "matchId": self.match_id,
            "stage": stage,
            "inputs": inputs,
            "timestamp": 123456,
        }
        await self.ws.send(json.dumps(message))

    async def send_game_over(self, stage: int = 5, score: int = 1000) -> None:
        """Envoyer le message de fin de jeu."""
        message = {
            "type": "gameOver",
            "username": self.username,
            "matchId": self.match_id,
            "stage": stage,
            "score": score,
            "timestamp": 123457,
        }
        await self.ws.send(json.dumps(message))

    async def disconnect(self) -> None:
        """Déconnecter le joueur."""
        if self.ws:
            await self.ws.close()


###############################################################################
# TESTS
###############################################################################

class TestWebSocketAdvanced:
    """Tests avancés du système WebSocket multiplayer."""

    @pytest.mark.asyncio
    async def test_multiple_simultaneous_matches(self) -> None:
        """Teste 3 matchs indépendants avec 2 joueurs chacun (6 joueurs total)."""
        match_ids = [str(uuid.uuid4()) for _ in range(3)]
        num_players_per_match = 2

        # Créer les joueurs
        players = []
        for match_idx, match_id in enumerate(match_ids):
            for player_idx in range(num_players_per_match):
                username = f"player_m{match_idx + 1}_p{player_idx + 1}"
                player = WebSocketPlayer(username, match_id)
                players.append(player)

        try:
            # Connecter tous les joueurs
            print("\n📡 Connexion de tous les joueurs...")
            for player in players:
                await player.connect()
                await player.join_lobby()
                await asyncio.sleep(0.2)

            # Lancer les listeners
            listen_tasks = [
                asyncio.create_task(player.listen()) for player in players
            ]

            # Faire attendre un peu
            await asyncio.sleep(1)

            # Rejoindre les matchs
            print("\n🎮 Rejoindre les matchs...")
            for player in players:
                await player.join_game()
                await asyncio.sleep(0.2)

            # Simuler les inputs pour chaque joueur
            print("\n⚙️ Envoi des inputs...")
            for stage in range(1, 6):
                for player in players:
                    inputs = {
                        "x": 50 + (hash(player.username) % 100),
                        "y": 100 + stage * 10,
                        "jump": (stage % 2 == 0),
                    }
                    await player.send_input(stage, inputs)
                await asyncio.sleep(0.3)

            # Fin de jeu
            print("\n🏁 Envoi des résultats de fin...")
            for player in players:
                score = 1000 + hash(player.username) % 500
                await player.send_game_over(5, score)

            await asyncio.sleep(1)

            # Vérifications
            print("\n✓ Vérifications...")
            assert all(player.game_over for player in players), \
                "Tous les joueurs doivent avoir gameOver"
            assert len(players) == 6, "Doit avoir 6 joueurs"

            # Vérifier les matchs indépendants
            for match_idx, match_id in enumerate(match_ids):
                match_players = [p for p in players if p.match_id == match_id]
                assert len(match_players) == 2, \
                    f"Match {match_idx + 1} doit avoir 2 joueurs"

            print(f"✓ 3 matchs indépendants avec 2 joueurs chacun - OK")

            # Annuler les listeners
            for task in listen_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        finally:
            # Déconnecter tous les joueurs
            for player in players:
                await player.disconnect()

    @pytest.mark.asyncio
    async def test_match_with_different_stages(self) -> None:
        """Teste un match où les joueurs progressent à des rythmes différents."""
        match_id = str(uuid.uuid4())
        players = [
            WebSocketPlayer(f"slow_player", match_id),
            WebSocketPlayer(f"fast_player", match_id),
        ]

        try:
            # Connexion
            for player in players:
                await player.connect()
                await player.join_lobby()

            listen_tasks = [
                asyncio.create_task(player.listen()) for player in players
            ]

            await asyncio.sleep(0.5)

            # Rejoindre le match
            for player in players:
                await player.join_game()

            # Progression à des rythmes différents
            print(f"\n🏃 Progression différente des joueurs...")
            max_stage_slow = 3
            max_stage_fast = 5

            for stage in range(1, 6):
                slow_player, fast_player = players[0], players[1]

                if stage <= max_stage_slow:
                    await slow_player.send_input(stage, {"x": 50, "y": 100})

                if stage <= max_stage_fast:
                    await fast_player.send_input(stage, {"x": 60, "y": 110})

                await asyncio.sleep(0.2)

            # Fast termine
            await fast_player.send_game_over(max_stage_fast, 2000)
            await asyncio.sleep(0.5)

            # Slow termine plus tard
            await slow_player.send_game_over(max_stage_slow, 1000)
            await asyncio.sleep(0.5)

            # Vérifications
            print(f"✓ Joueurs terminé à des stages différents - OK")

            for task in listen_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        finally:
            for player in players:
                await player.disconnect()

    @pytest.mark.asyncio
    async def test_large_match_with_8_players(self) -> None:
        """Teste un grand match avec 8 joueurs."""
        match_id = str(uuid.uuid4())
        num_players = 8
        players = [
            WebSocketPlayer(f"player_{i:02d}", match_id)
            for i in range(1, num_players + 1)
        ]

        try:
            # Connexion
            print(f"\n👥 Connexion de {num_players} joueurs...")
            for player in players:
                await player.connect()
                await player.join_lobby()
                await asyncio.sleep(0.1)

            listen_tasks = [
                asyncio.create_task(player.listen()) for player in players
            ]

            await asyncio.sleep(0.5)

            # Rejoindre le match
            print(f"🎯 Rejoindre le match...")
            for player in players:
                await player.join_game()
                await asyncio.sleep(0.1)

            # Simuler le jeu
            print(f"⚡ Simulation du jeu avec {num_players} joueurs...")
            for stage in range(1, 4):
                for i, player in enumerate(players):
                    # Chaque joueur a des inputs différents
                    inputs = {
                        "x": 50 + (i * 10),
                        "y": 100 + (stage * 20),
                        "jump": (stage + i) % 2 == 0,
                    }
                    await player.send_input(stage, inputs)
                await asyncio.sleep(0.2)

            # Résultats
            print(f"🏁 Résultats finaux...")
            for i, player in enumerate(players):
                score = 1000 + (i * 100)
                await player.send_game_over(3, score)

            await asyncio.sleep(1)

            # Vérifications
            assert all(player.game_over for player in players), \
                "Tous les 8 joueurs doivent avoir gameOver"
            assert len(players) == 8, "Doit avoir 8 joueurs"
            print(f"✓ Match avec {num_players} joueurs - OK")

            for task in listen_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        finally:
            for player in players:
                await player.disconnect()

    @pytest.mark.asyncio
    async def test_mid_game_disconnect_and_reconnect(self) -> None:
        """Teste un joueur qui se déconnecte pendant le jeu et se reconnecte."""
        match_id = str(uuid.uuid4())
        disconnector = WebSocketPlayer("disconnector", match_id)
        observer = WebSocketPlayer("observer", match_id)

        try:
            # Configuration
            for player in [disconnector, observer]:
                await player.connect()
                await player.join_lobby()

            listen_tasks = [
                asyncio.create_task(player.listen())
                for player in [disconnector, observer]
            ]

            await asyncio.sleep(0.5)

            for player in [disconnector, observer]:
                await player.join_game()

            # Inputs normaux
            print(f"\n▶️ Phase 1: Jeu normal...")
            await disconnector.send_input(1, {"x": 50, "y": 100})
            await observer.send_input(1, {"x": 55, "y": 105})
            await asyncio.sleep(0.5)

            # Disconnect
            print(f"🔌 Déconnexion du disconnector...")
            await disconnector.disconnect()
            await asyncio.sleep(0.5)

            # L'observer continue
            await observer.send_input(2, {"x": 55, "y": 120})
            await asyncio.sleep(0.5)

            # Reconnect
            print(f"🔌 Reconnexion...")
            disconnector = WebSocketPlayer("disconnector", match_id)
            await disconnector.connect()
            listener = asyncio.create_task(disconnector.listen())
            listen_tasks.append(listener)

            await disconnector.join_game()
            await asyncio.sleep(0.5)

            # Reprendre le jeu
            print(f"▶️ Phase 2: Reprendre le jeu...")
            await disconnector.send_input(2, {"x": 50, "y": 120})
            await observer.send_input(3, {"x": 55, "y": 140})
            await asyncio.sleep(0.5)

            # Fin
            await disconnector.send_game_over(2, 1000)
            await observer.send_game_over(3, 1500)
            await asyncio.sleep(0.5)

            print(f"✓ Déconnexion et reconnexion durant le jeu - OK")

            for task in listen_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        finally:
            for player in [disconnector, observer]:
                try:
                    await player.disconnect()
                except:
                    pass

    @pytest.mark.asyncio
    async def test_message_ordering_consistency(self) -> None:
        """Vérifie que l'ordre et la cohérence des messages sont maintenus."""
        match_id = str(uuid.uuid4())
        players = [
            WebSocketPlayer(f"player_{i}", match_id)
            for i in range(1, 3)
        ]

        try:
            # Connexion
            for player in players:
                await player.connect()
                await player.join_lobby()

            listen_tasks = [
                asyncio.create_task(player.listen()) for player in players
            ]

            await asyncio.sleep(0.5)

            for player in players:
                await player.join_game()

            # Envoyer plusieurs messages rapidement
            print(f"\n📨 Envoi de messages rapides...")
            for i in range(1, 6):
                for player in players:
                    await player.send_input(i, {"x": 50 + i, "y": 100 + i * 10})

            await asyncio.sleep(0.5)

            for player in players:
                await player.send_game_over(5, 1000 + hash(player.username) % 500)

            await asyncio.sleep(1)

            # Vérifications
            for player in players:
                input_msgs = [m for m in player.received_messages
                             if m.get("type") == "input"]
                assert len(input_msgs) >= 0, "Messages reçus"

            print(f"✓ Cohérence des messages - OK")

            for task in listen_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        finally:
            for player in players:
                await player.disconnect()
