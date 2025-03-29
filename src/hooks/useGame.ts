import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, GameState, GameEvent, Connection, Property, NotificationState } from '../types/game';
import { Character, characters } from '../data/characters'; // Import Character type and characters array
import PeerService from '../services/PeerService';
import { dominicanProperties } from '../data/dominican-properties';
import { toast } from 'sonner';
import { boxCards, surpriseCards } from '@/data/special-cards';
import { DEFAULT_REWARD_GO } from '@/lib/colors';
 
const INITIAL_MONEY = 1500;
const BOT_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33D1', '#33D1FF', '#D1FF33', '#FF5733', '#D133FF'];
const PLAYER_COLORS = ['#F2C85A', '#E55934', '#46B1C9', '#009B77', '#533747'];
const BOT_DECISION_DELAY = 1500; // Bot thinking time in ms
const BOT_PROPERTY_BUY_CHANCE = 0.7; // 70% chance to buy properties

// 3D Objects
const HOUSE_X1 = './assets/3d/Building/Building_1.fbx'

export const useGame = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // --- Helper Functions ---

  const getRailroadsOwned = (playerId: string, properties: Property[]): number => {
    return properties.filter(p => p.owner === playerId && p.color === 'railroad').length;
  };

  const getUtilitiesOwned = (playerId: string, properties: Property[]): number => {
    return properties.filter(p => p.owner === playerId && p.color === 'utility').length;
  };

  const calculateRent = (property: Property, ownerId: string, gameState: GameState, diceSum: number): number => {
    if (property.mortgaged || !property.owner || property.owner !== ownerId) {
      return 0; // No rent if mortgaged or owner mismatch (shouldn't happen with checks)
    }

    const owner = gameState.players.find(p => p.id === ownerId);
    if (!owner) return 0; // Should not happen

    switch (property.color) {
      case 'railroad': {
        const railroadsOwned = getRailroadsOwned(ownerId, gameState.properties);
        return property.rent[Math.max(0, railroadsOwned - 1)] || 0; // Use count-1 as index
      }
      case 'utility': {
        const utilitiesOwned = getUtilitiesOwned(ownerId, gameState.properties);
        const multiplier = property.rent[Math.max(0, utilitiesOwned - 1)] || 0; // Use count-1 as index
        return multiplier * diceSum;
      }
      default: // Regular property
        // TODO: Add logic for checking if owner owns all properties of the color group (doubles rent on unimproved lots)
        return property.rent[property.houses || 0] || 0; // Use houses as index
    }
  };


  // --- Core Hooks Logic ---

  const initializePeer = useCallback(async (name: string) => {
    try {
      const peerId = await PeerService.initialize(name);
      setGameId(peerId);
      return peerId;
    } catch (error) {
      console.error('Failed to initialize peer:', error);
      toast.error("Failed to initialize peer-to-peer connection");
      return null;
    }
  }, [toast]);

  // Update createGame signature
  const createGame = useCallback(async (name: string, character: Character, players: number) => { 
    setPlayerName(name);
    setMaxPlayers(players);
    setIsCreator(true);
    
    const peerId = await initializePeer(name);
    if (!peerId) return;
    
    const initialState: GameState = { // Define type explicitly
      id: peerId,
      players: [{
        id: peerId,
        name,
        type: 'human',
        position: 0,
        money: INITIAL_MONEY,
        properties: [],
        avatar: '', // Avatar might be derived from character later
        color: PLAYER_COLORS[0],
        isJailed: false,
        character: character // Use the passed character
      }],
      currentPlayer: 0,
      properties: dominicanProperties.map(p => ({ ...p, owner: null })), // Ensure owner is initially null
      dice: [1, 1],
      gameStarted: false,
      gameOver: false,
      maxPlayers: players,
      isCreator: true,
      hasDiceRolled: false,
      cardStacks: {
        surprise: surpriseCards,
        box: boxCards
      }
    };
    setGameState(initialState);
    gameStateRef.current = initialState; // Initialize ref
    
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

        // Adjust currentPlayer index if the disconnected player affects the turn order
        if (prevState.players[prevState.currentPlayer]?.id === data.peerId) {
           // If the disconnected player was current, move to the "next" player in the reduced list
           nextPlayerIndex = prevState.currentPlayer % remainingPlayers.length;
           needsTurnReset = true; // Reset dice roll status for the new current player
        } else if (disconnectedPlayerIndex < prevState.currentPlayer) {
           // Adjust index if the disconnected player was before the current player
           nextPlayerIndex = prevState.currentPlayer - 1;
        }
        // Ensure index is valid after potential adjustments
        nextPlayerIndex = Math.max(0, nextPlayerIndex % remainingPlayers.length);


        const newState = {
          ...prevState,
          players: remainingPlayers,
          currentPlayer: nextPlayerIndex,
          // Reset hasDiceRolled only if the turn was forced to change
          hasDiceRolled: needsTurnReset ? false : prevState.hasDiceRolled,
        };
        // Broadcast the updated state immediately after a disconnect adjustment
        PeerService.sendToAll({ type: 'game-state', payload: newState });
        return newState;
      });
      
      toast.error("A player has left the game");
    });
    
    PeerService.on('join-game', (data: { id: string; name: string }) => { // Added type
      console.log('Player joined:', data);
      
      // Prevent adding duplicates
      setConnections(prev => {
          if (prev.some(conn => conn.id === data.id)) return prev;
          return [...prev, { id: data.id, name: data.name }];
      });
      
      toast.success(`${data.name} has joined the game`);
      
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
  }, [initializePeer, toast]);

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
      
      // Client listens for game state updates from the creator
      PeerService.on('game-state', (state: GameState) => { // Added type
        console.log('Client received game state:', state);
        // Ensure properties have owner field if missing from host state
        const propertiesWithOwner = state.properties.map(p => ({ ...p, owner: p.owner || null }));
        setGameState(prevState => ({
          ...state,
          properties: propertiesWithOwner,
          isCreator: false // Ensure client knows they are not creator
        }));
      });

      PeerService.on('notify-users', (state: NotificationState) => { // Added type
        console.log('Client received notification:', state);
        toast.success(state.description);
      });
      
      // Client listens for the start-game signal (though full state is also sent)
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
      toast.error("Failed to join the game. The game may not exist or has already started.");
      return null;
    }
  }, [initializePeer, toast]);

  const startGame = useCallback(() => {
    const currentCreatorState = gameStateRef.current; // Use ref
    if (!currentCreatorState || !isCreator) return;
    
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
        isJailed: false,
        character: currentCreatorState.players[0].character // Creator keeps their chosen character
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
        isJailed: false,
        character: characters[(index + 1) % characters.length] // Assign default characters cyclically
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
        isJailed: false,
        character: characters[(humanPlayers.length + index) % characters.length] // Assign default characters cyclically
    }));
    
    const players = [...humanPlayers, ...botPlayers];
    
    const updatedState: GameState = {
      ...currentCreatorState,
      players,
      gameStarted: true,
      currentPlayer: 0, // Start with player 0
      hasDiceRolled: false,
      properties: currentCreatorState.properties.map(p => ({ ...p, owner: null })) // Reset owners on start
    };
    
    setGameState(updatedState); // Update creator's state
    
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
    
    toast.success(`Game started with ${players.length} players`);
    
    PeerService.sendToAll({
      type: 'notify-users',
      payload: {
        message: "Game Started",
        description: `Game started with ${players.length} players`
      }
    });

    // Bot turn logic is handled by the useEffect hook watching gameState

  }, [isCreator, connections, maxPlayers, playerName, toast]); // Removed gameState dependency, use ref

  // --- rollDice (Client Action) ---
  // Modified to accept dice values from the component
  const rollDice = useCallback((dice: [number, number]) => { 
    const currentState = gameStateRef.current; // Use ref for immediate access
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;
    
    const currentPlayerIndex = currentState.currentPlayer;
    const currentPlayer = currentState.players[currentPlayerIndex];
    
    // Check if it's the current human player's turn
    const isMyTurn = currentPlayer.type === 'human' && currentPlayer.id === PeerService.getCurrentPeerId();

    if (!isMyTurn) {
      console.log("Not your turn to roll dice.");
      toast.error("It's not your turn.");
      return;
    }

    if (currentState.hasDiceRolled) {
      console.log("Already rolled this turn.");
      toast.error("You've already rolled the dice this turn.");
      return;
    }
    
    // Use the dice values passed from the component
    const [dice1, dice2] = dice;
    const diceSum = dice1 + dice2;
    console.log('dice: ', dice);
    console.log('dice sum: ', diceSum);
    
    // --- Client calculates its *intended* new state ---
    const updatedPlayers = [...currentState.players];
    const updatedPlayer = { ...currentPlayer };
    console.log('checking if send to jail: ', updatedPlayer.position + diceSum);
    if (updatedPlayer.position + diceSum === 30) { // Go to Jail position
      onUpdateJailStatus(currentPlayer.id, true); // Set jailed status
      updatedPlayer.position = (10) % 40; // GO to
      PeerService.sendToAll({
        type: 'notify-users',
        payload: {
          message: `${currentPlayer.name} jail!`,
          description: `${currentPlayer.name} went to jail!`
        }
      });   
    } else {
      updatedPlayer.position = (updatedPlayer.position + diceSum) % 40; // Calculate new position
      setTimeout(() => {
        // Check if player passed GO (position 0)
        console.log('new position: ', updatedPlayer.position, currentPlayer.position);
        if ((currentPlayer.position > updatedPlayer.position) || updatedPlayer.position === 0) {
          console.log('reward: ', currentPlayer.id);
          onUpdateMoney(currentPlayer.id, DEFAULT_REWARD_GO); // Reward $200 for passing GO
          PeerService.sendToAll({
            type: 'notify-users',
            payload: {
              message: `${currentPlayer.name} reward!`,
              description: `${currentPlayer.name} has earn a GO Reward!`
            }
          });    
        }

        // Check if player landed on a bot-owned property
        const propertyAtPosition = currentState.properties.find(p => p.position === updatedPlayer.position);
        if (propertyAtPosition && propertyAtPosition.owner && 
            propertyAtPosition.owner !== currentPlayer.id && 
            !propertyAtPosition.mortgaged) {
          
          const owner = currentState.players.find(p => p.id === propertyAtPosition.owner);
          if (owner && owner.type === 'bot') {
            const rentAmount = calculateRent(propertyAtPosition, owner.id, currentState, diceSum);
            if (rentAmount > 0) {
              onUpdateMoney(currentPlayer.id, -rentAmount); // Deduct from player
              onUpdateMoney(owner.id, rentAmount); // Add to bot owner
              PeerService.sendToAll({
                type: 'notify-users',
                payload: {
                  message: "Rent Paid",
                  description: `${currentPlayer.name} paid $${rentAmount} rent to ${owner.name} for ${propertyAtPosition.name}`
                }
              });
              toast.success(`You paid $${rentAmount} rent to ${owner.name}`);
            }
          }
        }
      }, 1000);
    }

    updatedPlayers[currentPlayerIndex] = updatedPlayer;
    
    const clientUpdatedState: GameState = {
      ...currentState,
      players: updatedPlayers,
      dice: [dice1, dice2], // Use the passed-in dice roll results
      hasDiceRolled: true // Mark dice as rolled for this turn
    };
    
    // --- Client updates its own state immediately (Optimistic Update) ---
    setGameState(clientUpdatedState);
    
    // --- Client broadcasts its calculated state to everyone (including creator) ---
    PeerService.sendToAll({
      type: 'game-state',
      payload: clientUpdatedState
    });

    // Local toast for the player who rolled
    toast.success(`You rolled ${dice1} + ${dice2} = ${diceSum}`);

    PeerService.sendToAll({
      type: 'notify-users',
      payload: {
        message: `${currentPlayer.name} rolled!`,
        description: `${currentPlayer.name} rolled the dice ${dice1} + ${dice2} = ${diceSum}`
      }
    });

  }, [toast]); // Dependencies: toast. gameState is accessed via ref.

  // --- endTurn (Client Action) ---
  const endTurn = useCallback(() => {
    const currentState = gameStateRef.current; // Use ref
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;
    
    const currentPlayerIndex = currentState.currentPlayer;
    const currentPlayer = currentState.players[currentPlayerIndex];

    // Check if it's the current human player's turn
    const isMyTurn = currentPlayer.type === 'human' && currentPlayer.id === PeerService.getCurrentPeerId();

    if (!isMyTurn) {
      console.log("Not your turn to end.");
      toast.error("It's not your turn.");
      return;
    }

    if (!currentState.hasDiceRolled) {
      console.log("Must roll dice before ending turn");
      toast.error("You need to roll the dice first.");
      return;
    }
    
    // Calculate the next player index
    const nextPlayerIndex = (currentPlayerIndex + 1) % currentState.players.length;
    
    // Create the state representing the end of the turn
    const endTurnState: GameState = {
      ...currentState,
      currentPlayer: nextPlayerIndex,
      hasDiceRolled: false // Reset for the next player
    };
    
    // Client updates its own state immediately
    setGameState(endTurnState);
    
    // Client broadcasts the end-of-turn state to everyone
    PeerService.sendToAll({
      type: 'game-state',
      payload: endTurnState
    });

    PeerService.sendToAll({
      type: 'notify-users',
      payload: {
        message: "Turn Ended",
        description: `${currentPlayer.name} Has Ended his turn`
      }
    });  

  }, [toast]); // Dependencies: toast. gameState is accessed via ref.

  // --- buyProperty (Client Action) ---
  const buyProperty = useCallback(() => {
    const currentState = gameStateRef.current; // Use ref
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;
    
    const currentPlayerIndex = currentState.currentPlayer;
    const currentPlayer = currentState.players[currentPlayerIndex];

    // Check if it's the current human player's turn
    const isMyTurn = currentPlayer.type === 'human' && currentPlayer.id === PeerService.getCurrentPeerId();
    
    if (!isMyTurn) {
      console.log("Not your turn to buy property.");
      toast.error("It's not your turn.");
      return;
    }

    if (!currentState.hasDiceRolled) {
      console.log("Cannot buy property before rolling dice.");
       toast.error("Roll the dice first.");
      return;
    }
    
    const propertyIndex = currentState.properties.findIndex(
      p => p.position === currentPlayer.position
    );
    
    if (propertyIndex === -1) { console.log("No property at this position."); return; }
    
    const property = currentState.properties[propertyIndex];
    
    // --- Perform checks based on current state ---
    if (property.owner) {
        console.log("Property already owned.");
        const ownerName = currentState.players.find(p => p.id === property.owner)?.name || 'someone';
        toast.success(`${property.name} is already owned by ${ownerName}.`);
        return;
    }

    if (currentPlayer.money < property.price) {
        console.log("Not enough money.");
        toast.error(`You need $${property.price} to buy ${property.name}.`);
        return;
    }
    
    // --- Client calculates the new state after purchase ---
    const updatedPlayers = [...currentState.players];
    updatedPlayers[currentPlayerIndex] = { 
      ...currentPlayer,
      money: currentPlayer.money - property.price,
      properties: [...currentPlayer.properties, property.id]
    };
    
    const updatedProperties = [...currentState.properties];
    updatedProperties[propertyIndex] = { ...property, owner: currentPlayer.id };
    
    const purchasedState: GameState = {
      ...currentState,
      players: updatedPlayers,
      properties: updatedProperties
    };
    
    // Client updates its own state immediately
    setGameState(purchasedState);
    
    // Client broadcasts the purchase state to everyone
    PeerService.sendToAll({ type: 'game-state', payload: purchasedState });
    
    // Send notification to all peers
    PeerService.sendToAll({
      type: 'notify-users',
      payload: {
        message: "Property Purchased",
        description: `${currentPlayer.name} bought ${property.name} for $${property.price}`
      }
    });

    // Local toast
    toast.success(`You bought ${property.name} for $${property.price}`);

  }, []); // Dependencies: toast. gameState is accessed via ref.

  // --- handleBotTurn (Creator Only Logic) ---
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
      currentLoopState = getCurrentGameState(); // Refresh state before action
      if (!currentLoopState || currentLoopState.currentPlayer !== botPlayerIndex || currentLoopState.hasDiceRolled) {
         console.log(`Bot turn ${botPlayer.name} aborted (before roll processing).`); return;
      }
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const diceSum = dice1 + dice2;
      let newPosition = (botPlayer.position + diceSum) % 40;
      console.log('checking bot position: ', newPosition);

      if (newPosition === 30) { // Go to Jail position
        onUpdateJailStatus(botPlayer.id, true); // Set jailed status
        newPosition = (10) % 40; // GO to
        PeerService.sendToAll({
          type: 'notify-users',
          payload: {
            message: `${botPlayer.name} jail!`,
            description: `${botPlayer.name} went to jail!`
          }
        });   
      } else {
        setTimeout(() => {
          // Check if player passed GO (position 0)
          console.log('new position: ', newPosition, botPlayer.position);
          if ((newPosition < botPlayer.position) || newPosition === 0) {
            console.log('reward: ', botPlayer.id);
            onUpdateMoney(botPlayer.id, DEFAULT_REWARD_GO); // Reward $200 for passing GO
            PeerService.sendToAll({
              type: 'notify-users',
              payload: {
                message: `${botPlayer.name} reward!`,
                description: `${botPlayer.name} has earn a GO Reward!`
              }
            });    
          }
        }, 1000);
      }
      const playersAfterRoll = [...currentLoopState.players];
      playersAfterRoll[botPlayerIndex] = { ...botPlayer, position: newPosition };
      const stateAfterRoll: GameState = {
        ...currentLoopState,
        players: playersAfterRoll,
        dice: [dice1, dice2],
        hasDiceRolled: true
      };
      setGameState(stateAfterRoll); // Creator updates state
      PeerService.sendToAll({ type: 'game-state', payload: stateAfterRoll }); // Creator broadcasts
      const rollMessage = `${botPlayer.name} rolled ${dice1} + ${dice2} = ${diceSum}`;
      toast.success(rollMessage);
      PeerService.sendToAll({
        type: 'notify-users',
        payload: {
          message: "Bot Roll",
          description: rollMessage
        }
      });
      console.log(`Bot ${botPlayer.name} rolled ${diceSum}, moved to ${newPosition}`);

      // --- Step 2: Action (e.g., Buy Property) ---
      await new Promise(resolve => setTimeout(resolve, BOT_DECISION_DELAY));
      currentLoopState = getCurrentGameState(); // Refresh state before action
      if (!currentLoopState || currentLoopState.currentPlayer !== botPlayerIndex) {
         console.log(`Bot turn ${botPlayer.name} aborted (before action).`); return;
      }
      const botPlayerAfterRoll = currentLoopState.players[botPlayerIndex]; // Get potentially updated bot player state
      const propertyAtPosition = currentLoopState.properties.find(p => p.position === botPlayerAfterRoll.position);
      let stateAfterAction = currentLoopState; // Start with the state after rolling
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
             stateAfterAction = { // Update stateAfterAction
               ...currentLoopState, // Build upon state after roll
               players: playersAfterBuy,
               properties: propertiesAfterBuy
             };
             setGameState(stateAfterAction); // Creator updates state
             PeerService.sendToAll({ type: 'game-state', payload: stateAfterAction }); // Creator broadcasts
             toast.success(`${botPlayerAfterRoll.name} bought ${propertyAtPosition.name}`);
             console.log(`Bot ${botPlayer.name} bought ${propertyAtPosition.name}`);
             didBotBuyProperty = true;
             PeerService.sendToAll({
              type: 'notify-users',
              payload: {
                message: "Bot Purchase",
                description: `${botPlayerAfterRoll.name} bought ${propertyAtPosition.name}`
              }
              });  
          }
        } else {
            toast.success(`${botPlayerAfterRoll.name} declined to buy ${propertyAtPosition.name}`);
            PeerService.sendToAll({
            type: 'notify-users',
            payload: {
              message: "Bot Decision",
              description: `${botPlayerAfterRoll.name} declined to buy ${propertyAtPosition.name}`
            }
            });
           console.log(`Bot ${botPlayer.name} declined ${propertyAtPosition.name}`);
        }
      } else if (propertyAtPosition && propertyAtPosition.owner && propertyAtPosition.owner !== botPlayerAfterRoll.id && !propertyAtPosition.mortgaged) {
        console.log(`Bot ${botPlayer.name} landed on owned property ${propertyAtPosition.name} owned by ${propertyAtPosition.owner}`);
        const ownerIndex = currentLoopState.players.findIndex(p => p.id === propertyAtPosition.owner);
        if (ownerIndex !== -1) {
          const owner = currentLoopState.players[ownerIndex];
          // Use the dice roll from the *start* of the bot's turn for utility calculation
          const rentDiceSum = stateAfterRoll.dice[0] + stateAfterRoll.dice[1];
          const rentAmount = calculateRent(propertyAtPosition, owner.id, currentLoopState, rentDiceSum);

          if (rentAmount > 0) {
            console.log(`Rent due: $${rentAmount}`);
            const playersAfterRent = [...currentLoopState.players]; // Use state after potential buy attempt
            let botMoney = botPlayerAfterRoll.money;
            let ownerMoney = owner.money;

            if (botMoney >= rentAmount) {
              botMoney -= rentAmount;
              ownerMoney += rentAmount;
              toast.success(`${botPlayerAfterRoll.name} paid $${rentAmount} rent to ${owner.name} for ${propertyAtPosition.name}`);
              PeerService.sendToAll({
                type: 'notify-users',
                payload: {
                  message: "Rent Paid",
                  description: `${botPlayerAfterRoll.name} paid $${rentAmount} rent to ${owner.name} for ${propertyAtPosition.name}`
                }
              });
            } else {
              // Handle bankruptcy scenario (simplified: pay what you can, owner gets less)
              ownerMoney += botMoney;
              toast.error(`${botPlayerAfterRoll.name} couldn't afford full rent, paid $${botMoney} to ${owner.name}. (Bankruptcy logic needed)`);
              PeerService.sendToAll({
                type: 'notify-users',
                payload: {
                  message: "Rent Paid",
                  description: `${botPlayerAfterRoll.name} couldn't afford full rent, paid $${botMoney} to ${owner.name}. (Bankruptcy logic needed)`
                }
              });
              botMoney = 0;
              // TODO: Implement full bankruptcy logic (selling assets, removing player)
            }

            playersAfterRent[botPlayerIndex] = { ...botPlayerAfterRoll, money: botMoney };
            playersAfterRent[ownerIndex] = { ...owner, money: ownerMoney };

            stateAfterAction = { // Update stateAfterAction based on rent payment
              ...currentLoopState, // Build upon state after potential buy
              players: playersAfterRent
            };
            setGameState(stateAfterAction); // Creator updates state
            PeerService.sendToAll({ type: 'game-state', payload: stateAfterAction }); // Creator broadcasts
          }
        } else {
          console.warn(`Owner ${propertyAtPosition.owner} not found for rent payment.`);
        }
      }

      // --- Step 3: End Turn ---
      await new Promise(resolve => setTimeout(resolve, didBotBuyProperty ? BOT_DECISION_DELAY : 800));
      currentLoopState = getCurrentGameState(); // Refresh state before ending turn
      if (!currentLoopState || currentLoopState.currentPlayer !== botPlayerIndex) {
         console.log(`Bot turn ${botPlayer.name} aborted (before end turn).`); return;
      }
      const nextPlayerIndex = (botPlayerIndex + 1) % currentLoopState.players.length;
      const finalStateForTurn: GameState = {
        ...currentLoopState, // Build upon the state after potential action
        currentPlayer: nextPlayerIndex,
        hasDiceRolled: false
      };
      setGameState(finalStateForTurn); // Creator updates state
      PeerService.sendToAll({ type: 'game-state', payload: finalStateForTurn }); // Creator broadcasts
      toast.success(`${botPlayer.name} ended their turn.`);
      console.log(`Bot ${botPlayer.name} ended turn. Next player: ${nextPlayerIndex}`);
      PeerService.sendToAll({
        type: 'notify-users',
        payload: {
          message: "Bot Turn End",
          description: `${botPlayer.name} ended their turn.`
        }
      });
      // The useEffect hook below will catch the change in currentPlayer for the next bot/player.

    };
    
    executeBotTurn().catch(err => {
       console.error(`Error during bot ${botPlayerIndex} turn:`, err);
       toast.error(`Error during ${gameStateRef.current?.players[botPlayerIndex]?.name}'s turn.`);
       // Attempt to recover by ending the turn forcefully
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

  // --- Effect for Creator to handle incoming GameState updates (Validation) ---
  useEffect(() => {
    if (!isCreator) return; // Only creator validates and corrects state

    const handleGameStateUpdate = (receivedState: GameState) => {
      console.log('[Creator] Received game state update:', receivedState);
      const creatorState = gameStateRef.current; // Get creator's current authoritative state

      if (!creatorState || creatorState.gameOver) {
        console.log('[Creator] Ignoring update, game over or no state.');
        return; // Ignore if game is over or creator has no state
      }

      // Basic validation: Ensure the received state ID matches the game ID
      if (receivedState.id !== gameId) {
        console.warn("[Creator] Received game state with mismatched ID. Ignoring.");
        return;
      }

      // --- State Correction Logic ---
      let correctedState = { ...receivedState }; // Start with received state
      let needsCorrectionBroadcast = false;

      // ** Dice Roll Validation **
      // Check if this update represents a dice roll completion by the current player
      const prevPlayerState = creatorState.players[creatorState.currentPlayer];
      const receivedPlayerState = receivedState.players[receivedState.currentPlayer];

      // Ensure dice values are valid numbers before summing
      const receivedDice = receivedState.dice;
      if (!Array.isArray(receivedDice) || receivedDice.length !== 2 || typeof receivedDice[0] !== 'number' || typeof receivedDice[1] !== 'number') {
          console.warn('[Creator] Received invalid dice values in game state update. Ignoring roll validation.', receivedDice);
      } else if (prevPlayerState && receivedPlayerState && // Ensure players exist
          receivedState.currentPlayer === creatorState.currentPlayer && // Still the same player's turn
          receivedPlayerState.id === prevPlayerState.id && // Correct player ID
          !creatorState.hasDiceRolled && receivedState.hasDiceRolled // Roll just happened
         )
      {
          console.log(`[Creator] Detected dice roll completion for player ${receivedPlayerState.name}`);
          // Validate the position based on creator's state + received dice
          const diceSum = receivedDice[0] + receivedDice[1];
          const correctNewPosition = (prevPlayerState.position + diceSum) % 40;
          let playerLandedOnProperty: Property | undefined = undefined; // Keep track of property landed on

          if (receivedPlayerState.position !== correctNewPosition) {
              console.warn(`[Creator] Correcting player position! Client sent ${receivedPlayerState.position}, calculated ${correctNewPosition}`);
              const correctedPlayers = [...receivedState.players]; // Start with received players
              correctedPlayers[receivedState.currentPlayer] = {
                  ...receivedPlayerState,
                  position: correctNewPosition
              };
              correctedState = { ...correctedState, players: correctedPlayers }; // Update state being built
              needsCorrectionBroadcast = true;
              playerLandedOnProperty = correctedState.properties.find(p => p.position === correctNewPosition);
          } else {
              console.log(`[Creator] Player position matches calculated position (${correctNewPosition}).`);
              playerLandedOnProperty = correctedState.properties.find(p => p.position === correctNewPosition); // Still need property info
          }

          // --- Rent Payment Logic (After Position Validation/Correction) ---
          if (playerLandedOnProperty && playerLandedOnProperty.owner && playerLandedOnProperty.owner !== receivedPlayerState.id && !playerLandedOnProperty.mortgaged) {
              console.log(`[Creator] Player ${receivedPlayerState.name} landed on owned property ${playerLandedOnProperty.name} owned by ${playerLandedOnProperty.owner}`);
              const ownerIndex = correctedState.players.findIndex(p => p.id === playerLandedOnProperty.owner); // Use correctedState players
              const currentPlayerIndex = correctedState.currentPlayer; // Index of the player who landed

              if (ownerIndex !== -1 && currentPlayerIndex !== -1) {
                  const owner = correctedState.players[ownerIndex];
                  const currentPlayer = correctedState.players[currentPlayerIndex]; // Get the player who has to pay
                  const rentAmount = calculateRent(playerLandedOnProperty, owner.id, correctedState, diceSum); // Use correctedState

                  if (rentAmount > 0) {
                      console.log(`[Creator] Rent due: $${rentAmount}`);
                      const playersAfterRent = [...correctedState.players]; // Copy players from potentially corrected state
                      let payerMoney = currentPlayer.money;
                      let ownerMoney = owner.money;

                      if (payerMoney >= rentAmount) {
                          payerMoney -= rentAmount;
                          ownerMoney += rentAmount;
                          // Toast is tricky here, rely on client UI reacting to state change
                      } else {
                          // Handle bankruptcy (simplified)
                          ownerMoney += payerMoney;
                          payerMoney = 0;
                          // TODO: Implement full bankruptcy logic
                      }

                      playersAfterRent[currentPlayerIndex] = { ...currentPlayer, money: payerMoney };
                      playersAfterRent[ownerIndex] = { ...owner, money: ownerMoney };

                      correctedState = { // Update the state being built
                          ...correctedState,
                          players: playersAfterRent
                      };
                      needsCorrectionBroadcast = true; // Ensure this state is broadcast
                  }
              } else {
                  console.warn(`[Creator] Owner (${playerLandedOnProperty.owner}) or Payer (${receivedPlayerState.id}) not found for rent payment.`);
              }
          }
      }

      // ** End Turn Validation **
      // Check if this update represents an end turn
      if (receivedState.currentPlayer !== creatorState.currentPlayer && // Current player changed
          !receivedState.hasDiceRolled // hasDiceRolled should be false for the new player
         )
      {
          console.log(`[Creator] Detected end turn. New player: ${receivedState.currentPlayer}`);
          // Basic validation: Ensure the next player index is logical
          const expectedNextPlayer = (creatorState.currentPlayer + 1) % creatorState.players.length;
          if (receivedState.currentPlayer !== expectedNextPlayer) {
              console.warn(`[Creator] Correcting currentPlayer index! Client sent ${receivedState.currentPlayer}, expected ${expectedNextPlayer}`);
              correctedState = {
                  ...correctedState,
                  currentPlayer: expectedNextPlayer,
                  hasDiceRolled: false // Ensure reset
              };
              needsCorrectionBroadcast = true;
          }
      }
      
      // ** Buy Property Validation ** (Simplified - more checks could be added)
      // Find if a property owner changed compared to creator's state
      for (let i = 0; i < receivedState.properties.length; i++) {
          const receivedProp = receivedState.properties[i];
          const creatorProp = creatorState.properties.find(p => p.id === receivedProp.id);
          if (creatorProp && receivedProp.owner && receivedProp.owner !== creatorProp.owner) {
              console.log(`[Creator] Detected property purchase: ${receivedProp.name} by ${receivedProp.owner}`);
              // Find the buyer in the received state
              const buyerIndex = receivedState.players.findIndex(p => p.id === receivedProp.owner);
              const buyer = buyerIndex !== -1 ? receivedState.players[buyerIndex] : null;
              
              // Find the buyer in the creator's state *before* the purchase
              const creatorBuyerBeforePurchase = creatorState.players.find(p => p.id === receivedProp.owner);

              if (buyer && creatorBuyerBeforePurchase && creatorProp.price) {
                  const expectedMoneyAfterPurchase = creatorBuyerBeforePurchase.money - creatorProp.price;
                  if (buyer.money !== expectedMoneyAfterPurchase) {
                      console.warn(`[Creator] Correcting buyer money! Client sent ${buyer.money}, expected ${expectedMoneyAfterPurchase}`);
                      
                      const correctedPlayers = [...correctedState.players]; // Use players from potentially already corrected state
                      correctedPlayers[buyerIndex] = { ...buyer, money: expectedMoneyAfterPurchase };
                      
                      correctedState = { ...correctedState, players: correctedPlayers };
                      needsCorrectionBroadcast = true;
                  }
                  // Could add checks: was it the buyer's turn? Was the property actually unowned? etc.
              } else {
                  console.warn(`[Creator] Could not fully validate property purchase for ${receivedProp.name}. Buyer or price info missing.`);
              }
              // Assume only one property purchase per state update for simplicity
              break; 
          }
      }


      // --- Update Creator's State and Broadcast if Necessary ---
      // Ensure properties have owner field if missing (belt-and-suspenders)
      const propertiesWithOwner = correctedState.properties.map(p => ({ ...p, owner: p.owner || null }));
      const finalCorrectedState = {
          ...correctedState,
          properties: propertiesWithOwner,
          isCreator: true // Ensure creator status is maintained
      };

      // Update the creator's state regardless (to stay in sync or apply corrections)
      setGameState(finalCorrectedState);

      // If a correction was made, broadcast the authoritative state back to everyone
      if (needsCorrectionBroadcast) {
          console.log('[Creator] Broadcasting corrected state:', finalCorrectedState);
          PeerService.sendToAll({ type: 'game-state', payload: finalCorrectedState });
          PeerService.sendToAll({
            type: 'notify-users',
            payload: {
              message: "Game Updated",
              description: `Broadcasting corrected state`
            }
          });
      }
    };

    // Register the handler
    PeerService.on('game-state', handleGameStateUpdate);

    // Cleanup
    return () => {
      PeerService.off('game-state', handleGameStateUpdate);
    };
  }, [isCreator, gameId, toast]); // Dependencies


  // --- Effect for Creator to Trigger Bot Turns ---
  useEffect(() => {
    // Log dependencies every time this effect runs
    // console.log(`Bot Turn useEffect Check: isCreator=${isCreator}, gameStarted=${gameState?.gameStarted}, gameOver=${gameState?.gameOver}, currentPlayer=${gameState?.currentPlayer}, playerType=${gameState?.players[gameState?.currentPlayer ?? -1]?.type}`);

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
        }, 200); // Slightly increased delay

        // Cleanup function for the timeout
        return () => clearTimeout(timeoutId);
      }
    }
  }, [gameState, isCreator, handleBotTurn]); // Adjusted dependencies


  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
      PeerService.disconnect();
    };
  }, []);

  // --- New Game Action Functions ---

  const onMovePlayer = useCallback((playerId: string, newPosition: number) => {
    const currentState = gameStateRef.current;
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;

    const playerIndex = currentState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const player = currentState.players[playerIndex];
    const updatedPlayers = [...currentState.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      position: newPosition % 40
    };

    const updatedState: GameState = {
      ...currentState,
      players: updatedPlayers
    };

    setGameState(updatedState);
    
    // Check if player landed on a bot-owned property
    const propertyAtPosition = currentState.properties.find(p => p.position === newPosition % 40);
    if (propertyAtPosition && propertyAtPosition.owner && 
        propertyAtPosition.owner !== playerId && 
        !propertyAtPosition.mortgaged) {
      
      const owner = currentState.players.find(p => p.id === propertyAtPosition.owner);
      if (owner && owner.type === 'bot') {
        // Use last dice roll for rent calculation (utilities)
        const diceSum = currentState.dice[0] + currentState.dice[1];
        const rentAmount = calculateRent(propertyAtPosition, owner.id, currentState, diceSum);
        
        if (rentAmount > 0) {
          onUpdateMoney(playerId, -rentAmount); // Deduct from player
          onUpdateMoney(owner.id, rentAmount); // Add to bot owner
          PeerService.sendToAll({
            type: 'notify-users',
            payload: {
              message: "Rent Paid",
              description: `${player.name} paid $${rentAmount} rent to ${owner.name} for ${propertyAtPosition.name}`
            }
          });
          toast.success(`You paid $${rentAmount} rent to ${owner.name}`);
        }
      }
    }

    // Send game state update first
    PeerService.sendToAll({ type: 'game-state', payload: updatedState });
    
    // Then send notification with player name and new position
    PeerService.sendToAll({
      type: 'notify-users',
      payload: {
        message: "Player Moved",
        description: `${player.name} moved to position ${newPosition}`
      }
    });

    // Local toast
    toast.success(`You moved to position ${newPosition}`);
  }, [toast]);

  const onUpdateMoney = useCallback((playerId: string, amount: number) => {
    const currentState = gameStateRef.current;
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;

    const playerIndex = currentState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const updatedPlayers = [...currentState.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      money: Math.max(0, updatedPlayers[playerIndex].money + amount)
    };

    const updatedState: GameState = {
      ...currentState,
      players: updatedPlayers
    };

    setGameState(updatedState);
    PeerService.sendToAll({ type: 'game-state', payload: updatedState });

    toast.success(`$${Math.abs(amount)} ${amount >= 0 ? 'added to' : 'deducted from'} ${updatedPlayers[playerIndex].name}`);

    PeerService.sendToAll({
      type: 'notify-users',
      payload: {
        message: amount >= 0 ? "Money Added" : "Money Deducted",
        description: `$${Math.abs(amount)} ${amount >= 0 ? 'added to' : 'deducted from'} ${updatedPlayers[playerIndex].name}`
      }
    });
  }, [toast]);

  const onUpdateJailStatus = useCallback((playerId: string, jailed: boolean) => {
    const currentState = gameStateRef.current;
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;

    const playerIndex = currentState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const updatedPlayers = [...currentState.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      isJailed: jailed
    };

    const updatedState: GameState = {
      ...currentState,
      players: updatedPlayers
    };

    setGameState(updatedState);
    PeerService.sendToAll({ type: 'game-state', payload: updatedState });

    toast.success(`${updatedPlayers[playerIndex].name} ${jailed ? 'sent to' : 'released from'} jail`);

    PeerService.sendToAll({
      type: 'notify-users',
      payload: {
        message: jailed ? "Player Jailed" : "Player Released",
        description: `${updatedPlayers[playerIndex].name} ${jailed ? 'sent to' : 'released from'} jail`
      }
    });
  }, [toast]);

  // Rename onGiveJailCard to onJailCard
  const onJailCard = useCallback((playerId: string) => { 
    const currentState = gameStateRef.current;
    if (!currentState || !currentState.gameStarted || currentState.gameOver) return;

    const playerIndex = currentState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const updatedPlayers = [...currentState.players];
    // In a real implementation, we'd track jail cards in player state
    // This simplified version now just logs that the player received a card
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      // Would increment jail card count here
    };

    const updatedState: GameState = {
      ...currentState,
      players: updatedPlayers // Only potentially update the recipient's state if needed
    };

    // Update state locally (might not be necessary if only tracking card count)
    setGameState(updatedState); 
    // Broadcast the state if player object actually changed (e.g., card count)
    PeerService.sendToAll({ type: 'game-state', payload: updatedState }); 

    const recipientName = updatedPlayers[playerIndex].name;
    toast.success(`${recipientName} received a Get Out of Jail Free card`);

    PeerService.sendToAll({
      type: 'notify-users',
      payload: {
        message: 'Jail Card Received',
        description: `${recipientName} received a Get Out of Jail Free card`
      }
    });
  }, [toast]); // Keep dependencies

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
    buyProperty,
    onMovePlayer,
    onUpdateMoney,
    onUpdateJailStatus,
    onJailCard // Rename in returned object
  };
};
