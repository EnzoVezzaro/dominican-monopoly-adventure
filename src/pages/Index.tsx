
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import GameCreation from '@/components/GameCreation';
import WaitingRoom from '@/components/WaitingRoom';
import JoinGame from '@/components/JoinGame';
import GameBoard from '@/components/GameBoard';
import { useGame } from '@/hooks/useGame';
import { Character } from '@/data/characters'; // Import Character type

const Index = () => {
  const { 
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
    onJailCard // Rename destructured variable
  } = useGame();
  
  const [view, setView] = useState<'create' | 'join' | 'waiting' | 'game'>('create');
  const [joinGameId, setJoinGameId] = useState<string | null>(null);
  const location = useLocation();
  
  // Check URL for game ID
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gameParam = params.get('game');
    
    if (gameParam) {
      setJoinGameId(gameParam);
      setView('join');
    }
  }, [location.search]);
  
  // Handle game state changes
  useEffect(() => {
    if (gameState) {
      if (gameState.gameStarted) {
        setView('game');
      } else {
        setView('waiting');
      }
    }
  }, [gameState]);
  
  // Update handleCreateGame signature
  const handleCreateGame = async (name: string, character: Character, players: number) => { 
    // Pass character to the hook's createGame
    const newGameId = await createGame(name, character, players); 
    if (newGameId) {
      setView('waiting');
    }
  };
  
  const handleJoinGame = async (name: string, hostId: string) => {
    const newGameId = await joinGame(name, hostId);
    if (newGameId) {
      setView('waiting');
    }
  };
  
  const handleStartGame = () => {
    startGame();
    setView('game');
  };
  
  // Render based on current view
  switch (view) {
    case 'create':
      return <GameCreation onCreateGame={handleCreateGame} />;
      
    case 'join':
      return joinGameId ? (
        <JoinGame gameId={joinGameId} onJoinGame={handleJoinGame} />
      ) : (
        <GameCreation onCreateGame={handleCreateGame} />
      );
      
    case 'waiting':
      return gameId ? (
        <WaitingRoom
          gameId={gameId}
          connections={connections}
          playerName={playerName}
          maxPlayers={maxPlayers}
          isCreator={isCreator}
          onStartGame={handleStartGame}
        />
      ) : (
        <GameCreation onCreateGame={handleCreateGame} />
      );
      
    case 'game':
      return gameState ? (
        <GameBoard
          gameState={gameState}
          onRollDice={rollDice}
          onEndTurn={endTurn}
          onBuyProperty={buyProperty}
          onMovePlayer={onMovePlayer}
          onUpdateMoney={onUpdateMoney}
          onUpdateJailStatus={onUpdateJailStatus}
          onJailCard={onJailCard} // Rename prop passed to GameBoard
        />
      ) : (
        <GameCreation onCreateGame={handleCreateGame} />
      );
      
    default:
      return <GameCreation onCreateGame={handleCreateGame} />;
  }
};

export default Index;
