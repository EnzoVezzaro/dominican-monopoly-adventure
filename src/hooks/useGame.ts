import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { Player, GameState, GameEvent, Connection, Property } from '../types/game'; // Added Property type
import PeerService from '../services/PeerService';
import { dominicanProperties } from '../data/dominican-properties';
import { useToast } from '@/components/ui/use-toast';

const INITIAL_MONEY = 1500;
const BOT_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33D1', '#33D1FF', '#D1FF33', '#FF5733', '#D133FF'];
const PLAYER_COLORS = ['#F2C85A', '#E55934', '#46B1C9', '#009B77', '#533747'];
const BOT_DECISION_DELAY = 1500; // Bot thinking time in ms
const BOT_PROPERTY_BUY_CHANCE = 0.7; // 70% chance to buy properties

// Define specific types for event payloads
interface DiceRolledPayload {
  playerId: string;
  dice: [number, number];
  newPosition: number;
}

interface EndTurnPayload {
  playerId: string;
}

interface BuyPropertyPayload {
  playerId: string;
  propertyId: string;
}


export const useGame = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const { toast } = useToast();

  // Ref for checking state within useEffect timeout
  const gameStateRef = useRef(gameState);
  useEffect(() => {
      gameStateRef.current = gameState;
  }, [gameState]);


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
      properties: dominicanProperties.map(p => ({ ...p, owner: null })), // Ensure owner is initially null
      dice: [1, 1],
      gameStarted: false,
      gameOver: false,
      maxPlayers: players,
      isCreator: true,
      hasDiceRolled: false
    });
    
    PeerService.on('peer-disconnected', (data: { peerId: string }) => { // Added type
      console.log('Player disconnected:', data.peerId);
      setConnections(prev => prev.filter(conn => conn.id !== data.peerId));
      
      setGameState(prevState => {
        if (!prevState) return null;
        
        const disconnectedPlayerIndex = prevState.players.findIndex(p => p.id === data.peerId);
        if (disconnectedPlayerIndex === -1) return prevState; // Player not found

        const remainingPlayers = prevState.players.filter(player => player.id !== data.peerId);
        if (remainingPlayers.length === 0) {
            // Handle game ending or resetting if no players left
            console.log("Last player disconnected.");
            return { ...prevState, players: [], gameOver: true, gameStarted: false };
        }

        let nextPlayerIndex = prevState.currentPlayer;
        let needsTurnReset = false;

        if (prevState.players[prevState.currentPlayer]?.id === data.peerId) {
           // If the disconnected player was current, move to the "next" player in the reduced list
           nextPlayerIndex = prevState.currentPlayer % remainingPlayers.length;
           needsTurnReset = true; // Reset dice roll status for the new current player
        } else if (disconnectedPlayerIndex < prevState.currentPlayer) {
           // Adjust index if the disconnected player was before the current player
           nextPlayerIndex = prevState.currentPlayer - 1;
        }
        // Ensure index is valid after potential adjustments
        nextPlayerIndex = nextPlayerIndex % remainingPlayers.length;


        return {
          ...prevState,
          players: remainingPlayers,
          currentPlayer: nextPlayerIndex,
          // Reset hasDiceRolled only if the turn was forced to change
          hasDiceRolled: needsTurnReset ? false : prevState.hasDiceRolled,
        };
      });
      
      toast({
        title: "Player disconnected",
        description: "A player has left the game"
      });
    });
    
    PeerService.on('join-game', (data: { id: string; name: string }) => { // Added type
      console.log('Player joined:', data);
      
      // Prevent adding duplicates
      setConnections(prev => {
          if (prev.some(conn => conn.id === data.id)) return prev;
          return [...prev, { id: data.id, name: data.name }];
      });
      
      toast({
        title: "Player joined",
        description: `${data.name} has joined the game`
      });
      
      // Send the current state ONLY to the new player
      // Use gameStateRef.current to send the absolute latest state
      if (gameStateRef.current) {
        PeerService.sendToPeer(data.id, {
          type: 'game-state',
          payload: gameStateRef.current
        });
      }
    });
    
    return peerId;
  }, [initializePeer, toast]); // Removed gameState dependency

  const joinGame = useCallback(async (name: string, hostId: string) => {
    setPlayerName(name);
    setIsCreator(false);
    
    const peerId = await initializePeer(name);
    if (!peerId) return null;
    
    try {
      await PeerService.connectToPeer(hostId);
      
      // Send join request only to the host
      PeerService.sendToPeer(hostId, { // Changed from sendToAll
        type: 'join-game',
        payload: {
          id: peerId,
          name
        }
      });
      
      PeerService.on('game-state', (state: GameState) => { // Added type
        console.log('Received game state:', state);
        // Ensure properties have owner field if missing from host state
        const propertiesWithOwner = state.properties.map(p => ({ ...p, owner: p.owner || null }));
        setGameState(prevState => ({
          ...state,
          properties: propertiesWithOwner,
          isCreator: false // Ensure client knows they are not creator
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
      currentPlayer: 0, // Start with player 0
      hasDiceRolled: false,
      properties: gameState.properties.map(p => ({ ...p, owner: null })) // Reset owners on start
    };
    
    setGameState(updatedState);
    
    // Send full state to everyone on start
    PeerService.sendToAll({
      type: 'game-state',
      payload: updatedState
    });
    
    // Also send a specific start-game event if needed by clients
    PeerService.sendToAll({
      type: 'start-game',
      payload: {}
    });
    
    toast({
      title: "Game Started",
      description: `Game started with ${players.length} players`
    });

    // DO NOT trigger bot turn here - the useEffect hook watching currentPlayer will handle it.

  }, [gameState, isCreator, connections, maxPlayers, playerName, toast]);

  const rollDice = useCallback(() => {
    const currentState = gameStateRef.current; // Use ref for immediate access
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;
    
    const currentPlayerIndex = currentState.currentPlayer;
    const currentPlayer = currentState.players[currentPlayerIndex];
    
    const isMyTurn = currentPlayer.type === 'human' && currentPlayer.id === PeerService.getCurrentPeerId();
    
    if (!isMyTurn) {
      console.log("Not your turn to roll dice.");
      toast({ title: "Wait!", description: "It's not your turn.", variant: "destructive" });
      return;
    }

    if (currentState.hasDiceRolled) {
      console.log("Already rolled this turn.");
      toast({ title: "Oops!", description: "You've already rolled the dice this turn.", variant: "destructive" });
      return;
    }
    
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const diceSum = dice1 + dice2;
    
    const updatedPlayers = [...currentState.players];
    const updatedPlayer = { ...currentPlayer };
    
    updatedPlayer.position = (updatedPlayer.position + diceSum) % 40; // Assuming 40 squares
    updatedPlayers[currentPlayerIndex] = updatedPlayer;
    
    const updatedState: GameState = {
      ...currentState,
      players: updatedPlayers,
      dice: [dice1, dice2],
      hasDiceRolled: true // Mark dice as rolled for this turn
    };
    
    setGameState(updatedState); // Update local state
    
    // Send the updated state to all players
    PeerService.sendToAll({
      type: 'game-state',
      payload: updatedState
    });

    toast({
      title: "You rolled!",
      description: `You rolled ${dice1} + ${dice2} = ${diceSum}`
    });

  }, [toast]); // Dependencies: toast. gameState is accessed via ref.

  const endTurn = useCallback(() => {
    const currentState = gameStateRef.current; // Use ref
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;
    
    const currentPlayerIndex = currentState.currentPlayer;
    const currentPlayer = currentState.players[currentPlayerIndex];

    const isMyTurn = currentPlayer.type === 'human' && currentPlayer.id === PeerService.getCurrentPeerId();

    if (!isMyTurn) {
      console.log("Not your turn to end.");
      toast({ title: "Wait!", description: "It's not your turn.", variant: "destructive" });
      return;
    }

    if (!currentState.hasDiceRolled) {
      console.log("Must roll dice before ending turn");
      toast({ title: "Hold on!", description: "You need to roll the dice first.", variant: "destructive" });
      return;
    }
    
    const nextPlayerIndex = (currentPlayerIndex + 1) % currentState.players.length;
    
    const updatedState: GameState = {
      ...currentState,
      currentPlayer: nextPlayerIndex,
      hasDiceRolled: false // Reset for the next player
    };
    
    setGameState(updatedState); // Update local state
    
    // Send the updated state to all players
    PeerService.sendToAll({
      type: 'game-state',
      payload: updatedState
    });

    // DO NOT trigger bot turn here - the useEffect hook watching currentPlayer will handle it.

  }, [toast]); // Dependencies: toast. gameState is accessed via ref.

  const buyProperty = useCallback(() => {
    const currentState = gameStateRef.current; // Use ref
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;
    
    const currentPlayerIndex = currentState.currentPlayer;
    const currentPlayer = currentState.players[currentPlayerIndex];

    const isMyTurn = currentPlayer.type === 'human' && currentPlayer.id === PeerService.getCurrentPeerId();
    
    if (!isMyTurn) {
      console.log("Not your turn to buy property.");
      toast({ title: "Wait!", description: "It's not your turn.", variant: "destructive" });
      return;
    }

    if (!currentState.hasDiceRolled) {
      console.log("Cannot buy property before rolling dice.");
       toast({ title: "Hold on!", description: "Roll the dice first.", variant: "destructive" });
      return;
    }
    
    const propertyIndex = currentState.properties.findIndex(
      p => p.position === currentPlayer.position
    );
    
    if (propertyIndex === -1) { console.log("No property at this position."); return; }
    
    const property = currentState.properties[propertyIndex];
    
    if (property.owner) {
        console.log("Property already owned.");
        const ownerName = currentState.players.find(p => p.id === property.owner)?.name || 'someone';
        toast({ title: "Oops!", description: `${property.name} is already owned by ${ownerName}.` });
        return;
    }

    if (currentPlayer.money < property.price) {
        console.log("Not enough money.");
        toast({ title: "Not enough funds!", description: `You need $${property.price} to buy ${property.name}.`, variant: "destructive" });
        return;
    }
    
    // Proceed with purchase
    const updatedPlayers = [...currentState.players];
    updatedPlayers[currentPlayerIndex] = { 
      ...currentPlayer,
      money: currentPlayer.money - property.price,
      properties: [...currentPlayer.properties, property.id]
    };
    
    const updatedProperties = [...currentState.properties];
    updatedProperties[propertyIndex] = { ...property, owner: currentPlayer.id };
    
    const updatedState: GameState = {
      ...currentState,
      players: updatedPlayers,
      properties: updatedProperties
    };
    
    setGameState(updatedState); // Update local state
    
    PeerService.sendToAll({ type: 'game-state', payload: updatedState });
    
    toast({
      title: "Property Purchased!",
      description: `You bought ${property.name} for $${property.price}`
    });

  }, [toast]); // Dependencies: toast. gameState is accessed via ref.

  // handleBotTurn now only takes the index and relies on gameStateRef for current state
  const handleBotTurn = useCallback((botPlayerIndex: number) => {
    if (!isCreator) return;

    const getCurrentGameState = () => gameStateRef.current; // Use ref

    const executeBotTurn = async () => {
      let currentLoopState = getCurrentGameState();

      // Initial check
      if (!currentLoopState || !currentLoopState.gameStarted || currentLoopState.gameOver ||
          currentLoopState.players[botPlayerIndex]?.type !== 'bot' ||
          currentLoopState.currentPlayer !== botPlayerIndex) {
        console.log(`Bot turn ${botPlayerIndex} aborted (initial check). Current: ${currentLoopState?.currentPlayer}`);
        return;
      }
      const botPlayer = currentLoopState.players[botPlayerIndex];
      console.log(`Bot ${botPlayer.name} (${botPlayerIndex}) starting turn.`);

      // --- Step 1: Roll Dice ---
      await new Promise(resolve => setTimeout(resolve, BOT_DECISION_DELAY));
      currentLoopState = getCurrentGameState(); // Refresh state
      if (!currentLoopState || currentLoopState.currentPlayer !== botPlayerIndex || currentLoopState.hasDiceRolled) {
         console.log(`Bot turn ${botPlayer.name} aborted (before roll processing).`); return;
      }
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const diceSum = dice1 + dice2;
      const newPosition = (botPlayer.position + diceSum) % 40;
      const playersAfterRoll = [...currentLoopState.players];
      playersAfterRoll[botPlayerIndex] = { ...botPlayer, position: newPosition };
      const stateAfterRoll: GameState = { // Changed let to const
        ...currentLoopState,
        players: playersAfterRoll,
        dice: [dice1, dice2],
        hasDiceRolled: true
      };
      setGameState(stateAfterRoll);
      PeerService.sendToAll({ type: 'game-state', payload: stateAfterRoll });
      toast({ title: "Bot Roll", description: `${botPlayer.name} rolled ${dice1} + ${dice2} = ${diceSum}` });
      console.log(`Bot ${botPlayer.name} rolled ${diceSum}, moved to ${newPosition}`);

      // --- Step 2: Action (e.g., Buy Property) ---
      await new Promise(resolve => setTimeout(resolve, BOT_DECISION_DELAY));
      currentLoopState = getCurrentGameState(); // Refresh state
      if (!currentLoopState || currentLoopState.currentPlayer !== botPlayerIndex) {
         console.log(`Bot turn ${botPlayer.name} aborted (before action).`); return;
      }
      const botPlayerAfterRoll = currentLoopState.players[botPlayerIndex];
      const propertyAtPosition = currentLoopState.properties.find(p => p.position === botPlayerAfterRoll.position);
      let stateAfterAction = currentLoopState;
      let didBotBuyProperty = false;
      if (propertyAtPosition && !propertyAtPosition.owner && botPlayerAfterRoll.money >= propertyAtPosition.price) {
        const willBuy = Math.random() <= BOT_PROPERTY_BUY_CHANCE;
        if (willBuy) {
          const propertyIndex = currentLoopState.properties.findIndex(p => p.id === propertyAtPosition.id);
          if (propertyIndex !== -1) {
             const playersAfterBuy = [...currentLoopState.players];
             playersAfterBuy[botPlayerIndex] = {
               ...botPlayerAfterRoll,
               money: botPlayerAfterRoll.money - propertyAtPosition.price,
               properties: [...botPlayerAfterRoll.properties, propertyAtPosition.id]
             };
             const propertiesAfterBuy = [...currentLoopState.properties];
             propertiesAfterBuy[propertyIndex] = { ...propertyAtPosition, owner: botPlayerAfterRoll.id };
             stateAfterAction = {
               ...currentLoopState,
               players: playersAfterBuy,
               properties: propertiesAfterBuy
             };
             setGameState(stateAfterAction);
             PeerService.sendToAll({ type: 'game-state', payload: stateAfterAction });
             toast({ title: "Bot Purchase", description: `${botPlayerAfterRoll.name} bought ${propertyAtPosition.name}` });
             console.log(`Bot ${botPlayer.name} bought ${propertyAtPosition.name}`);
             didBotBuyProperty = true;
          }
        } else {
           toast({ title: "Bot Decision", description: `${botPlayerAfterRoll.name} declined to buy ${propertyAtPosition.name}` });
           console.log(`Bot ${botPlayer.name} declined ${propertyAtPosition.name}`);
        }
      } else if (propertyAtPosition && propertyAtPosition.owner && propertyAtPosition.owner !== botPlayerAfterRoll.id) {
          console.log(`Bot ${botPlayer.name} landed on owned property ${propertyAtPosition.name}`);
          // TODO: Implement rent payment logic here
      }

      // --- Step 3: End Turn ---
      await new Promise(resolve => setTimeout(resolve, didBotBuyProperty ? BOT_DECISION_DELAY : 800));
      currentLoopState = getCurrentGameState(); // Refresh state
      if (!currentLoopState || currentLoopState.currentPlayer !== botPlayerIndex) {
         console.log(`Bot turn ${botPlayer.name} aborted (before end turn).`); return;
      }
      const nextPlayerIndex = (botPlayerIndex + 1) % currentLoopState.players.length;
      const finalStateForTurn: GameState = {
        ...stateAfterAction,
        currentPlayer: nextPlayerIndex,
        hasDiceRolled: false
      };
      setGameState(finalStateForTurn);
      PeerService.sendToAll({ type: 'game-state', payload: finalStateForTurn });
      toast({ title: "Bot Turn End", description: `${botPlayer.name} ended their turn.` });
      console.log(`Bot ${botPlayer.name} ended turn. Next player: ${nextPlayerIndex}`);

      // The useEffect hook below will catch the change in currentPlayer for the next bot/player.

    };
    
    executeBotTurn().catch(err => {
       console.error(`Error during bot ${botPlayerIndex} turn:`, err);
       toast({ title: "Bot Error", description: `Error during ${gameStateRef.current?.players[botPlayerIndex]?.name}'s turn.`, variant: "destructive" });
       const currentState = getCurrentGameState();
       if (currentState && currentState.currentPlayer === botPlayerIndex) {
           const nextPlayerIndex = (botPlayerIndex + 1) % currentState.players.length;
           const errorState: GameState = { ...currentState, currentPlayer: nextPlayerIndex, hasDiceRolled: false };
           setGameState(errorState);
           PeerService.sendToAll({ type: 'game-state', payload: errorState });
           console.warn(`Forcefully ended bot ${botPlayerIndex}'s turn due to error.`);
       }
    });
  }, [isCreator, toast]); // Dependencies: isCreator, toast. gameState is accessed via ref.

  // Effect for Creator to handle events from clients
  useEffect(() => {
    if (!isCreator) return;

    const handleDiceRolled = (data: DiceRolledPayload) => {
      setGameState(prevState => {
        if (!prevState || prevState.gameOver || !prevState.gameStarted ||
            prevState.players[prevState.currentPlayer]?.id !== data.playerId ||
            prevState.players[prevState.currentPlayer]?.type !== 'human' ||
            prevState.hasDiceRolled) {
            console.warn("Invalid dice roll event received.", data.playerId, prevState?.currentPlayer, prevState?.hasDiceRolled);
            return prevState;
        }
        const playerIndex = prevState.currentPlayer;
        const updatedPlayers = [...prevState.players];
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], position: data.newPosition };
        const updatedState: GameState = { ...prevState, players: updatedPlayers, dice: data.dice, hasDiceRolled: true };
        PeerService.sendToAll({ type: 'game-state', payload: updatedState });
        return updatedState;
      });
    };
      
    const handleEndTurn = (data: EndTurnPayload) => {
       setGameState(prevState => {
         if (!prevState || prevState.gameOver || !prevState.gameStarted ||
             prevState.players[prevState.currentPlayer]?.id !== data.playerId ||
             prevState.players[prevState.currentPlayer]?.type !== 'human' ||
             !prevState.hasDiceRolled) {
             console.warn("Invalid end turn event received.", data.playerId, prevState?.currentPlayer, prevState?.hasDiceRolled);
             return prevState;
         }
         const nextPlayerIndex = (prevState.currentPlayer + 1) % prevState.players.length;
         const updatedState: GameState = { ...prevState, currentPlayer: nextPlayerIndex, hasDiceRolled: false };
         PeerService.sendToAll({ type: 'game-state', payload: updatedState });
         // DO NOT trigger bot turn here. useEffect handles it.
         return updatedState;
       });
    };
      
    const handleBuyProperty = (data: BuyPropertyPayload) => {
       setGameState(prevState => {
          if (!prevState || prevState.gameOver || !prevState.gameStarted ||
             prevState.players[prevState.currentPlayer]?.id !== data.playerId ||
             prevState.players[prevState.currentPlayer]?.type !== 'human') {
             console.warn("Invalid buy property event (player/type).", data.playerId); return prevState;
         }
         const playerIndex = prevState.currentPlayer;
         const player = prevState.players[playerIndex];
         const propertyIndex = prevState.properties.findIndex(p => p.id === data.propertyId);
         if (propertyIndex === -1) { console.warn("Invalid buy property event (id).", data.propertyId); return prevState; }
         const property = prevState.properties[propertyIndex];
          if (property.owner || player.money < property.price || property.position !== player.position) {
             console.warn("Invalid buy property event (owned/funds/pos).", property.owner, player.money, property.position, player.position); return prevState;
         }
         const updatedPlayers = [...prevState.players];
         updatedPlayers[playerIndex] = { ...player, money: player.money - property.price, properties: [...player.properties, data.propertyId] };
         const updatedProperties = [...prevState.properties];
         updatedProperties[propertyIndex] = { ...property, owner: data.playerId };
         const updatedState: GameState = { ...prevState, players: updatedPlayers, properties: updatedProperties };
         PeerService.sendToAll({ type: 'game-state', payload: updatedState });
         toast({
           title: "Property Purchased",
           description: `${player.name} bought ${property.name} for $${property.price}`
         });
         return updatedState;
       });
    };

    PeerService.on('dice-rolled', handleDiceRolled);
    PeerService.on('end-turn', handleEndTurn);
    PeerService.on('buy-property', handleBuyProperty);
      
    return () => {
      PeerService.off('dice-rolled', handleDiceRolled);
      PeerService.off('end-turn', handleEndTurn);
      PeerService.off('buy-property', handleBuyProperty);
    };
  }, [isCreator, toast]); // Dependencies: isCreator, toast. gameState is accessed via ref.

  // Effect for Creator to listen for general state updates from clients
  useEffect(() => {
    if (!isCreator) return; // Only creator needs this generic listener

    const handleGameStateUpdate = (state: GameState) => {
      console.log('Creator received game state update:', state);
      // Basic validation: Ensure the received state ID matches the game ID
      if (state.id !== gameId) {
        console.warn("Received game state with mismatched ID. Ignoring.");
        return;
      }
      // More robust validation could be added here (e.g., sequence numbers)

      // Ensure properties have owner field if missing
      const propertiesWithOwner = state.properties.map(p => ({ ...p, owner: p.owner || null }));

      // Update the creator's state. This will trigger other effects (like the bot turn effect).
      setGameState(prevState => ({
        ...state,
        properties: propertiesWithOwner,
        isCreator: true // Ensure creator status is maintained
      }));
    };

    PeerService.on('game-state', handleGameStateUpdate);

    return () => {
      PeerService.off('game-state', handleGameStateUpdate);
    };
    // Depend on gameId to ensure the correct ID is used in validation
  }, [isCreator, gameId]);


  // THIS useEffect is responsible for triggering bot turns
  useEffect(() => {
    // Log dependencies every time this effect runs
    console.log(`Bot Turn useEffect Check: isCreator=${isCreator}, gameStarted=${gameState?.gameStarted}, gameOver=${gameState?.gameOver}, currentPlayer=${gameState?.currentPlayer}, playerType=${gameState?.players[gameState?.currentPlayer ?? -1]?.type}`);

    // Check if creator, game started, not over, and current player exists and is a bot
    if (isCreator && gameState?.gameStarted && !gameState.gameOver && gameState.players && gameState.currentPlayer < gameState.players.length) {
      const currentPlayerIndex = gameState.currentPlayer;
      const currentPlayer = gameState.players[currentPlayerIndex];
      
      if (currentPlayer?.type === 'bot') {
        console.log(`useEffect detected bot ${currentPlayer.name}'s turn (${currentPlayerIndex}). Triggering handleBotTurn.`);
        // Use a small timeout to allow state updates to settle and prevent potential race conditions
        const timeoutId = setTimeout(() => {
            // Double-check the state *inside* the timeout before executing
            const latestState = gameStateRef.current;
            if (latestState?.gameStarted && !latestState.gameOver &&
                latestState.currentPlayer === currentPlayerIndex &&
                latestState.players[currentPlayerIndex]?.type === 'bot') {
                 handleBotTurn(currentPlayerIndex);
            } else {
                 console.log(`Bot turn trigger for index ${currentPlayerIndex} aborted (state changed during timeout). Current player: ${latestState?.currentPlayer}, Expected bot type: ${latestState?.players[currentPlayerIndex]?.type}`);
            }
        }, 150); // 150ms delay - slightly longer to be safer

        // Cleanup function for the timeout
        return () => clearTimeout(timeoutId);
      } else {
         // Log if the current player is not a bot when the effect runs
         if (currentPlayer) { // Check if currentPlayer exists before logging type
            console.log(`Bot Turn useEffect Check: Current player ${currentPlayerIndex} is type ${currentPlayer.type}, not triggering bot turn.`);
         } else {
            console.log(`Bot Turn useEffect Check: Current player ${currentPlayerIndex} not found.`);
         }
      }
    } else {
        // Log why the main condition failed
        console.log(`Bot Turn useEffect Check: Main condition failed (isCreator=${isCreator}, gameStarted=${gameState?.gameStarted}, gameOver=${gameState?.gameOver}, playersExist=${!!gameState?.players}, indexValid=${gameState ? gameState.currentPlayer < (gameState.players?.length ?? 0) : 'N/A'})`);
    }
    // Using gameState directly as a dependency might help catch nested changes more reliably
  }, [gameState, isCreator, handleBotTurn]); // Adjusted dependencies


  // Effect for cleanup on unmount
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
