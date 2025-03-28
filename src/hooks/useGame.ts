
import { useState, useEffect, useCallback } from 'react';
import { Player, GameState, GameEvent, Connection } from '../types/game';
import PeerService from '../services/PeerService';
import { dominicanProperties } from '../data/dominican-properties';
import { useToast } from '@/components/ui/use-toast';

const INITIAL_MONEY = 1500;
const BOT_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33D1', '#33D1FF', '#D1FF33', '#FF5733', '#D133FF'];
const PLAYER_COLORS = ['#F2C85A', '#E55934', '#46B1C9', '#009B77', '#533747'];

export const useGame = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const { toast } = useToast();

  // Initialize peer connection
  const initializePeer = useCallback(async (name: string) => {
    try {
      const peerId = await PeerService.initialize(name);
      setGameId(peerId);
      return peerId;
    } catch (error) {
      console.error('Failed to initialize peer:', error);
      toast({
        title: "Connection Error",
        description: "Failed to initialize peer-to-peer connection",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Create a new game
  const createGame = useCallback(async (name: string, players: number) => {
    setPlayerName(name);
    setMaxPlayers(players);
    setIsCreator(true);
    
    const peerId = await initializePeer(name);
    if (!peerId) return;
    
    setGameState({
      id: peerId,
      players: [{
        id: peerId,
        name,
        type: 'human',
        position: 0,
        money: INITIAL_MONEY,
        properties: [],
        avatar: '',
        color: PLAYER_COLORS[0],
        isJailed: false
      }],
      currentPlayer: 0,
      properties: dominicanProperties,
      dice: [1, 1],
      gameStarted: false,
      gameOver: false,
      maxPlayers: players,
      isCreator: true
    });
    
    // Listen for connections
    PeerService.on('peer-disconnected', (data) => {
      console.log('Player disconnected:', data.peerId);
      setConnections(prev => prev.filter(conn => conn.id !== data.peerId));
      
      // Update game state to remove disconnected player
      setGameState(prevState => {
        if (!prevState) return null;
        
        return {
          ...prevState,
          players: prevState.players.filter(player => player.id !== data.peerId)
        };
      });
      
      toast({
        title: "Player disconnected",
        description: "A player has left the game"
      });
    });
    
    // Handle player join events
    PeerService.on('join-game', (data) => {
      console.log('Player joined:', data);
      
      // Add player to connections
      setConnections(prev => [...prev, { id: data.id, name: data.name }]);
      
      toast({
        title: "Player joined",
        description: `${data.name} has joined the game`
      });
      
      // Send current game state to new player
      if (gameState) {
        PeerService.sendToPeer(data.id, {
          type: 'game-state',
          payload: gameState
        });
      }
    });
    
    return peerId;
  }, [initializePeer, toast]);

  // Join an existing game
  const joinGame = useCallback(async (name: string, hostId: string) => {
    setPlayerName(name);
    setIsCreator(false);
    
    const peerId = await initializePeer(name);
    if (!peerId) return null;
    
    try {
      // Connect to host
      await PeerService.connectToPeer(hostId);
      
      // Send join event to host
      PeerService.sendToAll({
        type: 'join-game',
        payload: {
          id: peerId,
          name
        }
      });
      
      // Listen for game state updates
      PeerService.on('game-state', (state) => {
        console.log('Received game state:', state);
        setGameState(prevState => ({
          ...state,
          isCreator: false
        }));
      });
      
      // Listen for game start event
      PeerService.on('start-game', () => {
        setGameState(prevState => {
          if (!prevState) return null;
          return {
            ...prevState,
            gameStarted: true
          };
        });
      });
      
      return peerId;
    } catch (error) {
      console.error('Failed to join game:', error);
      toast({
        title: "Connection Error",
        description: "Failed to join the game. The game may not exist or has already started.",
        variant: "destructive"
      });
      return null;
    }
  }, [initializePeer, toast]);

  // Start the game
  const startGame = useCallback(() => {
    if (!gameState || !isCreator) return;
    
    // Create player list
    const humanPlayers = [
      {
        id: PeerService.getCurrentPeerId() || '',
        name: playerName,
        type: 'human' as const,
        position: 0,
        money: INITIAL_MONEY,
        properties: [],
        avatar: '',
        color: PLAYER_COLORS[0],
        isJailed: false
      },
      ...connections.map((conn, index) => ({
        id: conn.id,
        name: conn.name || `Player ${index + 2}`,
        type: 'human' as const,
        position: 0,
        money: INITIAL_MONEY,
        properties: [],
        avatar: '',
        color: PLAYER_COLORS[(index + 1) % PLAYER_COLORS.length],
        isJailed: false
      }))
    ];
    
    // Add bots if needed
    const botsNeeded = Math.max(0, maxPlayers - humanPlayers.length);
    const botPlayers = Array.from({ length: botsNeeded }, (_, index) => ({
      id: `bot-${index}`,
      name: `Bot ${index + 1}`,
      type: 'bot' as const,
      position: 0,
      money: INITIAL_MONEY,
      properties: [],
      avatar: '',
      color: BOT_COLORS[index % BOT_COLORS.length],
      isJailed: false
    }));
    
    const players = [...humanPlayers, ...botPlayers];
    
    // Update game state
    const updatedState: GameState = {
      ...gameState,
      players,
      gameStarted: true,
      currentPlayer: 0
    };
    
    setGameState(updatedState);
    
    // Notify all players that the game has started
    PeerService.sendToAll({
      type: 'game-state',
      payload: updatedState
    });
    
    PeerService.sendToAll({
      type: 'start-game',
      payload: {}
    });
    
    toast({
      title: "Game Started",
      description: `Game started with ${players.length} players`
    });
  }, [gameState, isCreator, connections, maxPlayers, playerName, toast]);

  // Roll the dice
  const rollDice = useCallback(() => {
    if (!gameState) return;
    
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const diceSum = dice1 + dice2;
    
    // Update current player position
    const currentPlayerIndex = gameState.currentPlayer;
    const updatedPlayers = [...gameState.players];
    const currentPlayer = { ...updatedPlayers[currentPlayerIndex] };
    
    // Calculate new position
    currentPlayer.position = (currentPlayer.position + diceSum) % 40;
    updatedPlayers[currentPlayerIndex] = currentPlayer;
    
    const updatedState: GameState = {
      ...gameState,
      players: updatedPlayers,
      dice: [dice1, dice2]
    };
    
    setGameState(updatedState);
    
    // Notify all players about the updated state
    if (isCreator) {
      PeerService.sendToAll({
        type: 'game-state',
        payload: updatedState
      });
    }
  }, [gameState, isCreator]);

  // End the current player's turn
  const endTurn = useCallback(() => {
    if (!gameState) return;
    
    const nextPlayerIndex = (gameState.currentPlayer + 1) % gameState.players.length;
    
    const updatedState: GameState = {
      ...gameState,
      currentPlayer: nextPlayerIndex
    };
    
    setGameState(updatedState);
    
    // Notify all players about the updated state
    if (isCreator) {
      PeerService.sendToAll({
        type: 'game-state',
        payload: updatedState
      });
      
      // Handle bot turns
      if (gameState.players[nextPlayerIndex].type === 'bot') {
        // Simulate bot thinking
        setTimeout(() => {
          // Bot rolls dice
          rollDice();
          
          // Bot buys property if it can (simple AI)
          const currentPlayer = gameState.players[nextPlayerIndex];
          const propertyAtPosition = gameState.properties.find(
            p => p.position === currentPlayer.position
          );
          
          if (
            propertyAtPosition && 
            !propertyAtPosition.owner && 
            currentPlayer.money >= (propertyAtPosition.price || 0)
          ) {
            setTimeout(() => {
              buyProperty();
            }, 1000);
          }
          
          // Bot ends turn
          setTimeout(() => {
            endTurn();
          }, 2000);
        }, 1500);
      }
    }
  }, [gameState, isCreator, rollDice]);

  // Buy property
  const buyProperty = useCallback(() => {
    if (!gameState) return;
    
    const currentPlayerIndex = gameState.currentPlayer;
    const currentPlayer = gameState.players[currentPlayerIndex];
    
    // Find property at current position
    const propertyIndex = gameState.properties.findIndex(
      p => p.position === currentPlayer.position
    );
    
    if (propertyIndex === -1) return;
    
    const property = gameState.properties[propertyIndex];
    
    // Check if property can be bought
    if (property.owner || currentPlayer.money < property.price) return;
    
    // Update player's money and properties
    const updatedPlayers = [...gameState.players];
    const updatedPlayer = { 
      ...currentPlayer,
      money: currentPlayer.money - property.price,
      properties: [...currentPlayer.properties, property.id]
    };
    updatedPlayers[currentPlayerIndex] = updatedPlayer;
    
    // Update property owner
    const updatedProperties = [...gameState.properties];
    updatedProperties[propertyIndex] = {
      ...property,
      owner: currentPlayer.id
    };
    
    const updatedState: GameState = {
      ...gameState,
      players: updatedPlayers,
      properties: updatedProperties
    };
    
    setGameState(updatedState);
    
    // Notify all players about the updated state
    if (isCreator) {
      PeerService.sendToAll({
        type: 'game-state',
        payload: updatedState
      });
      
      toast({
        title: "Property Purchased",
        description: `${currentPlayer.name} bought ${property.name} for $${property.price}`
      });
    }
  }, [gameState, isCreator, toast]);

  // Clean up
  useEffect(() => {
    return () => {
      PeerService.disconnect();
    };
  }, []);

  return {
    gameId,
    playerName,
    maxPlayers,
    connections,
    gameState,
    isCreator,
    createGame,
    joinGame,
    startGame,
    rollDice,
    endTurn,
    buyProperty
  };
};
