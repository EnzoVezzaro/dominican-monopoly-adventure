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
      isCreator: true,
      hasDiceRolled: false
    });
    
    PeerService.on('peer-disconnected', (data) => {
      console.log('Player disconnected:', data.peerId);
      setConnections(prev => prev.filter(conn => conn.id !== data.peerId));
      
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
    
    PeerService.on('join-game', (data) => {
      console.log('Player joined:', data);
      
      setConnections(prev => [...prev, { id: data.id, name: data.name }]);
      
      toast({
        title: "Player joined",
        description: `${data.name} has joined the game`
      });
      
      if (gameState) {
        PeerService.sendToPeer(data.id, {
          type: 'game-state',
          payload: gameState
        });
      }
    });
    
    return peerId;
  }, [initializePeer, toast]);

  const joinGame = useCallback(async (name: string, hostId: string) => {
    setPlayerName(name);
    setIsCreator(false);
    
    const peerId = await initializePeer(name);
    if (!peerId) return null;
    
    try {
      await PeerService.connectToPeer(hostId);
      
      PeerService.sendToAll({
        type: 'join-game',
        payload: {
          id: peerId,
          name
        }
      });
      
      PeerService.on('game-state', (state) => {
        console.log('Received game state:', state);
        setGameState(prevState => ({
          ...state,
          isCreator: false
        }));
      });
      
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

  const startGame = useCallback(() => {
    if (!gameState || !isCreator) return;
    
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
    
    const updatedState: GameState = {
      ...gameState,
      players,
      gameStarted: true,
      currentPlayer: 0,
      hasDiceRolled: false
    };
    
    setGameState(updatedState);
    
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

  const rollDice = useCallback(() => {
    if (!gameState) return;
    
    const currentPlayerIndex = gameState.currentPlayer;
    const currentPlayer = gameState.players[currentPlayerIndex];
    const isMyTurn = currentPlayer.id === PeerService.getCurrentPeerId();
    
    if (!isMyTurn || gameState.hasDiceRolled) {
      console.log("Not your turn or already rolled");
      return;
    }
    
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const diceSum = dice1 + dice2;
    
    const updatedPlayers = [...gameState.players];
    const updatedPlayer = { ...currentPlayer };
    
    updatedPlayer.position = (updatedPlayer.position + diceSum) % 40;
    updatedPlayers[currentPlayerIndex] = updatedPlayer;
    
    const updatedState: GameState = {
      ...gameState,
      players: updatedPlayers,
      dice: [dice1, dice2],
      hasDiceRolled: true
    };
    
    setGameState(updatedState);
    
    if (isCreator) {
      PeerService.sendToAll({
        type: 'game-state',
        payload: updatedState
      });
    } else {
      PeerService.sendToAll({
        type: 'dice-rolled',
        payload: {
          playerId: PeerService.getCurrentPeerId(),
          dice: [dice1, dice2],
          newPosition: updatedPlayer.position
        }
      });
    }
  }, [gameState, isCreator]);

  const endTurn = useCallback(() => {
    if (!gameState) return;
    
    if (!gameState.hasDiceRolled) {
      console.log("Must roll dice before ending turn");
      return;
    }
    
    const nextPlayerIndex = (gameState.currentPlayer + 1) % gameState.players.length;
    
    const updatedState: GameState = {
      ...gameState,
      currentPlayer: nextPlayerIndex,
      hasDiceRolled: false
    };
    
    setGameState(updatedState);
    
    if (isCreator) {
      PeerService.sendToAll({
        type: 'game-state',
        payload: updatedState
      });
      
      if (gameState.players[nextPlayerIndex].type === 'bot') {
        setTimeout(() => {
          const botUpdatedState = { ...updatedState, hasDiceRolled: true };
          setGameState(botUpdatedState);
          
          PeerService.sendToAll({
            type: 'game-state',
            payload: botUpdatedState
          });
          
          rollDice();
          
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
          
          setTimeout(() => {
            endTurn();
          }, 2000);
        }, 1500);
      }
    } else {
      PeerService.sendToAll({
        type: 'end-turn',
        payload: {
          playerId: PeerService.getCurrentPeerId()
        }
      });
    }
  }, [gameState, isCreator, rollDice]);

  const buyProperty = useCallback(() => {
    if (!gameState) return;
    
    const currentPlayerIndex = gameState.currentPlayer;
    const currentPlayer = gameState.players[currentPlayerIndex];
    
    const isMyTurn = currentPlayer.id === PeerService.getCurrentPeerId();
    if (!isMyTurn || !gameState.hasDiceRolled) {
      console.log("Not your turn or dice not rolled yet");
      return;
    }
    
    const propertyIndex = gameState.properties.findIndex(
      p => p.position === currentPlayer.position
    );
    
    if (propertyIndex === -1) return;
    
    const property = gameState.properties[propertyIndex];
    
    if (property.owner || currentPlayer.money < property.price) return;
    
    const updatedPlayers = [...gameState.players];
    const updatedPlayer = { 
      ...currentPlayer,
      money: currentPlayer.money - property.price,
      properties: [...currentPlayer.properties, property.id]
    };
    updatedPlayers[currentPlayerIndex] = updatedPlayer;
    
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
    
    if (isCreator) {
      PeerService.sendToAll({
        type: 'game-state',
        payload: updatedState
      });
      
      toast({
        title: "Property Purchased",
        description: `${currentPlayer.name} bought ${property.name} for $${property.price}`
      });
    } else {
      PeerService.sendToAll({
        type: 'buy-property',
        payload: {
          playerId: PeerService.getCurrentPeerId(),
          propertyId: property.id
        }
      });
    }
  }, [gameState, isCreator, toast]);

  useEffect(() => {
    if (isCreator) {
      PeerService.on('dice-rolled', (data) => {
        if (!gameState) return;
        
        const { playerId, dice, newPosition } = data;
        
        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1 || playerIndex !== gameState.currentPlayer) return;
        
        const updatedPlayers = [...gameState.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          position: newPosition
        };
        
        const updatedState: GameState = {
          ...gameState,
          players: updatedPlayers,
          dice,
          hasDiceRolled: true
        };
        
        setGameState(updatedState);
        
        PeerService.sendToAll({
          type: 'game-state',
          payload: updatedState
        });
      });
      
      PeerService.on('end-turn', (data) => {
        if (!gameState) return;
        
        const { playerId } = data;
        
        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1 || playerIndex !== gameState.currentPlayer) return;
        
        const nextPlayerIndex = (gameState.currentPlayer + 1) % gameState.players.length;
        
        const updatedState: GameState = {
          ...gameState,
          currentPlayer: nextPlayerIndex,
          hasDiceRolled: false
        };
        
        setGameState(updatedState);
        
        PeerService.sendToAll({
          type: 'game-state',
          payload: updatedState
        });
        
        if (gameState.players[nextPlayerIndex].type === 'bot') {
          setTimeout(() => {
            const botUpdatedState = { ...updatedState, hasDiceRolled: true };
            setGameState(botUpdatedState);
            
            PeerService.sendToAll({
              type: 'game-state',
              payload: botUpdatedState
            });
            
            rollDice();
            
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
            
            setTimeout(() => {
              endTurn();
            }, 2000);
          }, 1500);
        }
      });
      
      PeerService.on('buy-property', (data) => {
        if (!gameState) return;
        
        const { playerId, propertyId } = data;
        
        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1 || playerIndex !== gameState.currentPlayer) return;
        
        const propertyIndex = gameState.properties.findIndex(p => p.id === propertyId);
        if (propertyIndex === -1) return;
        
        const property = gameState.properties[propertyIndex];
        const player = gameState.players[playerIndex];
        
        if (property.owner || player.money < property.price) return;
        
        const updatedPlayers = [...gameState.players];
        updatedPlayers[playerIndex] = {
          ...player,
          money: player.money - property.price,
          properties: [...player.properties, propertyId]
        };
        
        const updatedProperties = [...gameState.properties];
        updatedProperties[propertyIndex] = {
          ...property,
          owner: playerId
        };
        
        const updatedState: GameState = {
          ...gameState,
          players: updatedPlayers,
          properties: updatedProperties
        };
        
        setGameState(updatedState);
        
        PeerService.sendToAll({
          type: 'game-state',
          payload: updatedState
        });
        
        toast({
          title: "Property Purchased",
          description: `${player.name} bought ${property.name} for $${property.price}`
        });
      });
    }
    
    return () => {
      PeerService.off('dice-rolled');
      PeerService.off('end-turn');
      PeerService.off('buy-property');
    };
  }, [gameState, isCreator, rollDice, buyProperty, endTurn, toast]);

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
