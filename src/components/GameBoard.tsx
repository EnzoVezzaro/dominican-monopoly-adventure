
import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dices, CircleDollarSign, Home, Bot } from 'lucide-react';
import { GameState, Player, Property } from '@/types/game';
import PlayerInfo from './PlayerInfo';
import PeerService from '@/services/PeerService';
import PropertyActionCard from './PropertyActionCard'; // Import the new component

interface GameBoardProps {
  gameState: GameState;
  onRollDice: (dice: [number, number]) => void;
  onEndTurn: () => void;
  onBuyProperty: (propertyId: string) => void; // Pass property ID when buying
}

const Board = ({ properties, players, currentPlayer }: { 
  properties: GameState['properties'], 
  players: Player[],
  currentPlayer: number
}) => {
  const boardRef = useRef<THREE.Group>(null);
  
  const fallbackTexture = new THREE.TextureLoader().load(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  );
  
  const [textureLoadFailed, setTextureLoadFailed] = useState(false);
  
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      '/board-texture.jpg',
      () => {
        console.log('Board texture loaded successfully');
        setTextureLoadFailed(false);
      },
      undefined,
      () => {
        console.log('Failed to load board texture, using fallback');
        setTextureLoadFailed(true);
      }
    );
  }, []);
  
  const boardTexture = textureLoadFailed
    ? fallbackTexture
    : new THREE.TextureLoader().load('/board-texture.jpg');
  
  const boardSpaces = [];
  const boardSize = 10;
  const spaceSize = 1;
  
  for (let i = 0; i < 40; i++) {
    let x = 0;
    let z = 0;
    
    if (i < 10) { // Bottom row
      x = 5 - i * spaceSize;
      z = 5;
    } else if (i < 20) { // Left column
      x = -5;
      z = 5 - (i - 10) * spaceSize;
    } else if (i < 30) { // Top row
      x = -5 + (i - 20) * spaceSize;
      z = -5;
    } else { // Right column
      x = 5;
      z = -5 + (i - 30) * spaceSize;
    }
    
    const property = properties.find(p => p.position === i);
    const color = property ? property.color : '#cccccc';
    
    boardSpaces.push(
      <group key={`space-${i}`} position={[x, 0, z]}>
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[spaceSize, 0.1, spaceSize]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <Text
          position={[0, 0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.2}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {property ? property.name.substring(0, 10) : `Space ${i}`}
        </Text>
      </group>
    );
  }
  
  const playerTokens = players.map((player, index) => {
    const position = player.position;
    let x = 0;
    let z = 0;
    
    if (position < 10) { // Bottom row
      x = 5 - position * spaceSize;
      z = 5;
    } else if (position < 20) { // Left column
      x = -5;
      z = 5 - (position - 10) * spaceSize;
    } else if (position < 30) { // Top row
      x = -5 + (position - 20) * spaceSize;
      z = -5;
    } else { // Right column
      x = 5;
      z = -5 + (position - 30) * spaceSize;
    }
    
    x += (index % 3) * 0.25 - 0.25;
    z += Math.floor(index / 3) * 0.25 - 0.25;
    
    return (
      <mesh 
        key={`player-${player.id}`} 
        position={[x, 0.4, z]}
        castShadow
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color={player.color} 
          emissive={currentPlayer === index ? player.color : undefined}
          emissiveIntensity={0.5}
        />
      </mesh>
    );
  });
  
  return (
    <group ref={boardRef}>
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[boardSize, 0.1, boardSize]} />
        <meshStandardMaterial color="#f0f0f0" map={boardTexture} />
      </mesh>
      
      {boardSpaces}
      
      {playerTokens}
    </group>
  );
};

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onRollDice,
  onEndTurn,
  onBuyProperty
}) => {
  const [diceValues, setDiceValues] = useState<[number, number]>([1, 1]);
  const [diceRolling, setDiceRolling] = useState(false);
  const [propertyForAction, setPropertyForAction] = useState<Property | null>(null); // New state for the action card

  const currentPlayerIndex = gameState.currentPlayer;
  const currentPlayer = gameState.players[currentPlayerIndex];
  const isBot = currentPlayer?.type === 'bot';
  
  // Determine if it's the current user's turn
  const isMyTurn = currentPlayer && !isBot && 
    currentPlayer.id === PeerService.getCurrentPeerId();
  
  useEffect(() => {
    if (currentPlayer) {
      const propertyAtPosition = gameState.properties.find(
        p => p.position === currentPlayer.position
      );

      // Check if the property is buyable and it's the human player's turn after rolling
      const isBuyable = !!propertyAtPosition &&
                        !propertyAtPosition.owner &&
                        (propertyAtPosition.price !== undefined) && // Ensure it has a price (not Go, Jail, etc.)
                        gameState.hasDiceRolled && // Only show after dice roll
                        !isBot && // Only for human players
                        currentPlayer.id === PeerService.getCurrentPeerId(); // Only for the active player's client

      if (isBuyable) {
        setPropertyForAction(propertyAtPosition);
      } else {
        setPropertyForAction(null); // Clear if not buyable or not the right conditions
      }
    } else {
      setPropertyForAction(null); // Clear if no current player
    }
  }, [currentPlayer, gameState.properties, gameState.hasDiceRolled, isBot]);
  
  const handleRollDice = () => {
    setDiceRolling(true);
  
    // Counter to track the number of rolls
    let rollCount = 0;
  
    // To hold the latest dice roll values
    let latestDiceValues: [number, number] = [0, 0];
  
    const rollInterval = setInterval(() => {
      latestDiceValues = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
      setDiceValues(latestDiceValues); // Update the state with the latest values
      rollCount += 1;
  
      // Stop after 4 rolls
      if (rollCount === 4) {
        clearInterval(rollInterval);
        setDiceRolling(false);
        onRollDice(latestDiceValues); // Pass the final dice values
      }
    }, 100);
  };
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 relative">
        <Canvas
          shadows
          camera={{ position: [0, 15, 0], fov: 50, near: 0.1, far: 1000 }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} castShadow intensity={0.8} />
          <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} castShadow intensity={1} />
          
          <Board 
            properties={gameState.properties}
            players={gameState.players}
            currentPlayer={currentPlayerIndex}
          />
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2.5}
          />
        </Canvas>
        
        <div className="absolute top-4 right-4 space-y-2 max-h-[80vh] overflow-y-auto">
          {gameState.players.map((player, index) => (
            <PlayerInfo 
              key={player.id} 
              player={player} 
              isCurrentTurn={index === currentPlayerIndex}
              properties={gameState.properties}
            />
          ))}
        </div>
        
        <div className="absolute bottom-4 left-4 flex gap-4">
          <Card className="w-fit shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-2 gap-2">
                  {diceValues.map((value, index) => (
                    <div 
                      key={index}
                      className={`w-12 h-12 bg-white rounded-lg border border-game-primary shadow flex items-center justify-center text-2xl font-bold ${diceRolling ? 'animate-dice-roll' : ''}`}
                    >
                      {value}
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <Button
                    onClick={handleRollDice}
                    disabled={!isMyTurn || diceRolling || gameState.hasDiceRolled || isBot}
                    className="bg-game-primary hover:bg-game-primary/90 flex items-center gap-2"
                  >
                    <Dices size={16} />
                    Roll Dice
                  </Button>
                  
                  <Button
                    onClick={onEndTurn}
                    disabled={!isMyTurn || !gameState.hasDiceRolled || isBot}
                    variant="outline"
                    className="w-full border-game-primary/30"
                  >
                    End Turn
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Remove the old buy button card */}
        </div>

        {/* Render the PropertyActionCard */}
        {propertyForAction && currentPlayer && isMyTurn && (
          <PropertyActionCard
            property={propertyForAction}
            playerMoney={currentPlayer.money}
            onBuy={() => {
              onBuyProperty(propertyForAction.id);
              setPropertyForAction(null); // Close card after buying
            }}
            onPass={() => {
              setPropertyForAction(null); // Close card on pass
            }}
            open={!!propertyForAction}
          />
        )}

        <div className="absolute top-4 left-4 space-y-2">
          <Badge className="px-3 py-1 text-md bg-game-primary text-white">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: currentPlayer?.color }}
              ></div>
              {isBot && <Bot size={14} />}
              {currentPlayer?.name}'s Turn
            </div>
          </Badge>
          
          <div className="flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full text-sm">
            <CircleDollarSign size={14} className="text-game-primary" />
            <span>${currentPlayer?.money}</span>
          </div>
          
          {isBot && gameState.hasDiceRolled && (
            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm animate-pulse">
              Bot is thinking...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
