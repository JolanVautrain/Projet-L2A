"""Scénario frontend : Multijoueur WebSocket avec 10 joueurs.

Simule 10 joueurs connectés en simultané, qui rejoignent le lobby,
attendent le démarrage du jeu, puis jouent avec des actions synchronisées.
"""

import asyncio
import json
import uuid
from typing import Any, List

import pytest
import websockets


class WebSocketPlayer:
    """Représente un joueur connecté via WebSocket."""

    def __init__(self, username: str, ws_url: str = "ws://localhost:3001"):
        self.username = username
        self.ws_url = ws_url
        self.ws: Any = None
        self.match_id: str | None = None
        self.received_messages: List[dict] = []
        self.player_count: int = 0
        self.game_started = False
        self.game_over = False

    async def connect(self) -> None:
        """Établir la connexion WebSocket."""
        try:
            self.ws = await websockets.connect(self.ws_url, ping_interval=None)
            print(f"✓ {self.username} connecté au serveur WebSocket")
        except Exception as e:
            print(f"✗ {self.username} erreur de connexion: {e}")
            raise

    async def join_lobby(self) -> None:
        """Envoyer le message join au lobby."""
        message = {"type": "join_lobby", "username": self.username}
        await self.ws.send(json.dumps(message))
        print(f"✓ {self.username} rejoint le lobby")

    async def join_game(self) -> None:
        """Envoyer le message join_game pour rejoindre une partie."""
        if not self.match_id:
            raise ValueError(f"{self.username} n'a pas de matchId")
        message = {
            "type": "join_game",
            "username": self.username,
            "matchId": self.match_id,
        }
        await self.ws.send(json.dumps(message))
        print(f"✓ {self.username} rejoint la partie {self.match_id[:8]}...")

    async def send_input(self, input_type: str, sequence: int) -> None:
        """Envoyer une action de jeu (ex: JUMP)."""
        message = {
            "type": "input",
            "username": self.username,
            "input": input_type,
            "sequence": sequence,
            "matchId": self.match_id,
        }
        await self.ws.send(json.dumps(message))

    async def send_game_over(self) -> None:
        """Envoyer la notification game over."""
        message = {
            "type": "gameOver",
            "username": self.username,
            "matchId": self.match_id,
        }
        await self.ws.send(json.dumps(message))
        self.game_over = True

    async def listen(self) -> None:
        """Écouter les messages du serveur en continu."""
        try:
            async for raw_message in self.ws:
                try:
                    message = json.loads(raw_message)
                    self.received_messages.append(message)

                    # Mettre à jour l'état local en fonction du message
                    if message["type"] == "player_count":
                        self.player_count = message["count"]
                        print(
                            f"  📊 {self.username}: {self.player_count} joueurs en attente"
                        )

                    elif message["type"] == "start_game":
                        self.match_id = message["matchId"]
                        self.game_started = True
                        print(
                            f"  🎮 {self.username}: Jeu commencé! Match: {self.match_id[:8]}..."
                        )

                    elif message["type"] == "input_ack":
                        pass  # Confirmation d'input

                    elif message["type"] == "gameOver":
                        print(
                            f"  💀 {self.username}: {message['username']} game over"
                        )

                except json.JSONDecodeError:
                    print(f"✗ {self.username}: Erreur JSON dans le message")

        except websockets.exceptions.ConnectionClosed:
            print(f"✗ {self.username}: Connexion fermée par le serveur")

    async def disconnect(self) -> None:
        """Fermer la connexion WebSocket."""
        if self.ws:
            await self.ws.close()
            print(f"✓ {self.username} déconnecté")


class TestScenarioMultijoueurWebSocket:
    """Tests du système multijoueur avec WebSocket."""

    @pytest.mark.asyncio
    async def test_10_joueurs_connectes(self) -> None:
        """Scénario : 10 joueurs connectés au serveur WebSocket."""
        num_players = 10
        players = [
            WebSocketPlayer(f"player_{i:02d}") for i in range(1, num_players + 1)
        ]

        try:
            # Étape 1 : Connecter tous les joueurs
            print("\n=== Étape 1 : Connexion de 10 joueurs ===")
            connect_tasks = [player.connect() for player in players]
            await asyncio.gather(*connect_tasks)

            # Vérifier que tous les joueurs sont connectés
            assert all(
                player.ws is not None for player in players
            ), "Tous les joueurs doivent être connectés"
            print(f"✓ Tous les {num_players} joueurs connectés\n")

            # Étape 2 : Lancer les listeners pour recevoir les messages
            print("=== Étape 2 : Démarrage des listeners ===")
            listener_tasks = [
                asyncio.create_task(player.listen()) for player in players
            ]

            # Laisser un peu de temps aux listeners de démarrer
            await asyncio.sleep(0.1)
            print(f"✓ Listeners démarrés pour tous les joueurs\n")

            # Étape 3 : Tous les joueurs rejoignent le lobby
            print("=== Étape 3 : Rejoindre le lobby ===")
            join_lobby_tasks = [player.join_lobby() for player in players]
            await asyncio.gather(*join_lobby_tasks)
            print(f"✓ Tous les {num_players} joueurs ont rejoint le lobby\n")

            # Attendre les messages de comptage
            await asyncio.sleep(0.5)

            # Vérifier que les joueurs ont reçu les mises à jour de comptage
            for player in players:
                player_count_messages = [
                    msg for msg in player.received_messages
                    if msg["type"] == "player_count"
                ]
                assert len(player_count_messages) > 0, (
                    f"{player.username} n'a pas reçu de player_count"
                )
            print("✓ Tous les joueurs ont reçu les mises à jour player_count\n")

            # Étape 4 : Attendre le démarrage du jeu
            # (Le serveur démarre quand MIN_PLAYERS=2 sont connectés)
            print("=== Étape 4 : Attendre le démarrage du jeu ===")
            max_wait = 3.0
            start_time = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - start_time < max_wait:
                if any(player.game_started for player in players):
                    break
                await asyncio.sleep(0.1)

            # Vérifier que des joueurs ont reçu start_game
            started_players = [p for p in players if p.game_started]
            assert len(started_players) >= 2, (
                f"Au moins 2 joueurs doivent recevoir start_game, "
                f"reçu: {len(started_players)}"
            )
            print(f"✓ {len(started_players)} joueurs ont reçu start_game\n")

            # Pour les joueurs qui ont le match_id, les faire rejoindre la partie
            print("=== Étape 5 : Rejoindre la partie ===")
            join_game_tasks = [
                player.join_game()
                for player in players
                if player.match_id is not None
            ]
            if join_game_tasks:
                await asyncio.gather(*join_game_tasks)
                print(f"✓ {len(join_game_tasks)} joueurs ont rejoint la partie\n")

            # Attendre les confirmations
            await asyncio.sleep(0.3)

            # Étape 6 : Simuler le gameplay - envoyer des inputs
            print("=== Étape 6 : Simulation du gameplay ===")
            for round_num in range(1, 4):  # 3 rounds d'inputs
                print(f"  Round {round_num} : Envoi d'inputs...")
                tasks = []
                for player in players:
                    if player.match_id is not None:
                        tasks.append(
                            player.send_input("JUMP", sequence=round_num)
                        )
                if tasks:
                    await asyncio.gather(*tasks)
                await asyncio.sleep(0.2)

            # Attendre les acks
            await asyncio.sleep(0.3)

            # Vérifier que les joueurs ont reçu les input_ack
            for player in players:
                if player.match_id is not None:
                    input_ack_messages = [
                        msg for msg in player.received_messages
                        if msg["type"] == "input_ack"
                    ]
                    assert len(input_ack_messages) > 0, (
                        f"{player.username} n'a pas reçu d'input_ack"
                    )
            print("✓ Inputs envoyés et confirmés\n")

            # Étape 7 : Simuler la fin de partie
            print("=== Étape 7 : Fin de partie (gameOver) ===")
            gameover_tasks = [
                player.send_game_over()
                for player in players
                if player.match_id is not None
            ]
            if gameover_tasks:
                await asyncio.gather(*gameover_tasks)
                print(f"✓ {len(gameover_tasks)} joueurs ont signalé gameOver\n")

            # Attendre les messages gameOver
            await asyncio.sleep(0.3)

            # Vérifier que les joueurs ont reçu les messages gameOver
            for player in players:
                if player.match_id is not None:
                    gameover_messages = [
                        msg for msg in player.received_messages
                        if msg["type"] == "gameOver"
                    ]
                    assert len(gameover_messages) > 0, (
                        f"{player.username} n'a pas reçu de gameOver"
                    )
            print("✓ Messages gameOver reçus\n")

            # Résumé des statistiques
            print("=== Résumé des statistiques ===")
            for player in players:
                messages_count = len(player.received_messages)
                print(
                    f"  {player.username}: "
                    f"{messages_count} messages, "
                    f"started={player.game_started}, "
                    f"over={player.game_over}"
                )

        finally:
            # Étape 8 : Déconnecter tous les joueurs
            print("\n=== Étape 8 : Déconnexion ===")

            # Annuler les listeners
            for task in listener_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            # Fermer les connexions
            disconnect_tasks = [player.disconnect() for player in players]
            await asyncio.gather(*disconnect_tasks, return_exceptions=True)
            print(f"✓ Tous les {num_players} joueurs déconnectés\n")

    @pytest.mark.asyncio
    async def test_message_broadcast_vers_groupe(self) -> None:
        """Scénario : Vérifier que les messages sont broadcastés au groupe."""
        num_players = 4  # Utiliser 4 joueurs pour avoir au moins 2 groupes
        players = [
            WebSocketPlayer(f"test_broadcast_{i}") for i in range(1, num_players + 1)
        ]

        listener_tasks = []

        try:
            # Connecter les joueurs
            print("\n=== Test broadcast : Connexion ===")
            await asyncio.gather(*[player.connect() for player in players])

            # Démarrer les listeners
            listener_tasks = [
                asyncio.create_task(player.listen()) for player in players
            ]
            await asyncio.sleep(0.1)

            # Rejoindre le lobby progressivement
            print("=== Test broadcast : Rejoindre lobby ===")
            # Rejoindre les 2 premiers joueurs
            await players[0].join_lobby()
            await asyncio.sleep(0.1)
            await players[1].join_lobby()
            
            # Attendre que les 2 premiers reçoivent les mises à jour
            await asyncio.sleep(0.3)
            
            # Rejoindre les 2 suivants
            await players[2].join_lobby()
            await asyncio.sleep(0.1)
            await players[3].join_lobby()
            await asyncio.sleep(0.3)

            # Vérifier que tous les joueurs ont reçu des messages
            print("=== Test broadcast : Vérification ===")
            for player in players:
                player_count_msgs = [
                    msg for msg in player.received_messages
                    if msg["type"] == "player_count"
                ]
                assert len(player_count_msgs) > 0, (
                    f"{player.username}: Pas reçu player_count"
                )
            print(f"✓ Tous les joueurs reçoivent les mises à jour player_count")
            
            # Afficher les statistiques
            for player in players:
                player_count_msgs = [
                    msg for msg in player.received_messages
                    if msg["type"] == "player_count"
                ]
                print(f"  {player.username}: {len(player_count_msgs)} player_count, "
                      f"last={player_count_msgs[-1]['count'] if player_count_msgs else 'N/A'}")

        finally:
            print("\n=== Test broadcast : Déconnexion ===")
            for task in listener_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            await asyncio.gather(
                *[player.disconnect() for player in players],
                return_exceptions=True,
            )
            print(f"✓ Déconnexion complète")

    @pytest.mark.asyncio
    async def test_reconnexion_apres_deconnexion(self) -> None:
        """Scénario : Un joueur se déconnecte et se reconnecte."""
        print("\n=== Test reconnexion ===")
        player = WebSocketPlayer("test_reconnect")
        listener_task = None

        try:
            # Première connexion
            print("1. Première connexion...")
            await player.connect()
            listener_task = asyncio.create_task(player.listen())
            await asyncio.sleep(0.1)

            await player.join_lobby()
            await asyncio.sleep(0.2)

            initial_messages = len(player.received_messages)
            assert initial_messages > 0, "Devrait recevoir au moins player_count"
            print(f"✓ Première connexion OK: {initial_messages} messages reçus")

            # Déconnexion
            print("2. Déconnexion...")
            listener_task.cancel()
            try:
                await listener_task
            except asyncio.CancelledError:
                pass
            await player.disconnect()
            await asyncio.sleep(0.2)
            print("✓ Déconnecté")

            # Réinitialiser l'état du joueur
            player.received_messages = []
            player.player_count = 0
            player.game_started = False

            # Reconnexion
            print("3. Reconnexion...")
            await player.connect()
            listener_task = asyncio.create_task(player.listen())
            await asyncio.sleep(0.1)

            await player.join_lobby()
            await asyncio.sleep(0.2)

            reconnected_messages = len(player.received_messages)
            assert (
                reconnected_messages > 0
            ), "Devrait recevoir des messages après reconnexion"
            print(f"✓ Reconnectée OK: {reconnected_messages} messages reçus")

        finally:
            print("4. Nettoyage...")
            if listener_task:
                listener_task.cancel()
                try:
                    await listener_task
                except asyncio.CancelledError:
                    pass
            await player.disconnect()
            print("✓ Test reconnexion terminé")
