import React, { useRef, useEffect, useState, useCallback, Suspense } from 'react'; // Added Suspense
import { Canvas, useLoader, useFrame } from '@react-three/fiber'; // Added useLoader and useFrame
import { OrbitControls, Text, useTexture, useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'; // Added OBJLoader
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dices, CircleDollarSign, Home, Bot } from 'lucide-react';
import { GameState, Player, Property } from '@/types/game';
import PlayerInfo from './PlayerInfo';
import PlayerToken from './PlayerToken'; // Import the new component
import PeerService from '@/services/PeerService';
import PropertyActionCard from './PropertyActionCard';
import { DEFAULT_REWARD_GO, getPropertyColor } from '@/lib/colors';
import { CardEffectAction, handleCardEffect } from '@/lib/card-effects';

interface GameBoardProps {
  gameState: GameState;
  onRollDice: (dice: [number, number]) => void;
  onEndTurn: () => void;
  onBuyProperty: (propertyId: string) => void;
  onMovePlayer: (playerId: string, newPosition: number) => void;
  onUpdateMoney: (playerId: string, amount: number) => void;
  onUpdateJailStatus: (playerId: string, jailed: boolean) => void;
  onJailCard: (playerId: string) => void; // Rename prop
}

// Create a texture loader once outside of component to avoid recreating on every render
const textureLoader = new THREE.TextureLoader();
const fallbackTexture = textureLoader.load(
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
);

// Create a cached texture loader for board texture
let boardTextureCache: THREE.Texture | null = null;

const RotatingIndicator = () => {
  const ref = useRef<THREE.Group>(null);
  const playerIndicator = useFBX('/assets/3d/Players/Player_indicator.fbx');
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 2; // Rotate at 2 radians per second
    }
  });

  return (
    <group ref={ref}>
      <primitive
        object={playerIndicator.clone()}
        scale={0.005}
      />
    </group>
  );
};

const Board = ({ 
  properties, 
  players, 
  currentPlayer,
  onSpaceClick 
}: { 
  properties: Property[], 
  players: Player[],
  currentPlayer: number,
  onSpaceClick: (property: Property | null, position: number) => void
}) => {
  const boardRef = useRef<THREE.Group>(null);
  const [boardTexture, setBoardTexture] = useState<THREE.Texture>(fallbackTexture);
  
  // Load texture only once with useEffect
  useEffect(() => {
    if (!boardTextureCache) {
      textureLoader.load(
        '/board-texture.jpg',
        (texture) => {
          boardTextureCache = texture;
          setBoardTexture(texture);
        },
        undefined,
        () => {
          console.warn('Failed to load board texture, using fallback');
          setBoardTexture(fallbackTexture);
        }
      );
    } else {
      setBoardTexture(boardTextureCache);
    }
  }, []);
  
  const boardSize = 22;  // Keep same overall board size
  const spaceSize = 1.8; // Make properties thinner

  const houseModel = useFBX('/assets/3d/Buildings/Building_1.fbx');
  const houseModel4 = useFBX('/assets/3d/Buildings/Building_5.fbx');
  const hotelModel = useFBX('/assets/3d/Buildings/Building_3.fbx');
  
  const goTileModel = useFBX('/assets/3d/Props/Traffic_Light_2.fbx');
  // const jailModel = useFBX('/assets/3d/Buildings/Building_6.fbx');
  const goJailModel = useFBX('/assets/3d/Buildings/Building_7.fbx');
  const parkModel = useFBX('/assets/3d/Props/Tram_Stop_1.fbx');
  
  // Create board spaces
  const boardSpaces = [];
  for (let i = 0; i < 40; i++) {
    let x = 0, z = 0;
    const cornerOffset = boardSize / 2 - spaceSize / 2;
    
    if (i < 10) { 
      // First side (GO to JAIL) - correct as is
      if (i === 0) { x = cornerOffset; z = cornerOffset; } // GO
      else if (i < 10) { x = cornerOffset - i * spaceSize - 1.1; z = cornerOffset - 0.85; } // Properties 1-9
    }
    else if (i < 20) { 
      // Second side (JAIL to PARKING)
      if (i === 10) { x = -cornerOffset; z = cornerOffset; } // JAIL
      else if (i < 20) { x = -cornerOffset + spaceSize - 1; z = cornerOffset - (i - 10) * spaceSize - 1.1; } // Properties 11-19
    }
    else if (i < 30) { 
      // Third side (PARKING to GO TO JAIL)
      if (i === 20) { x = -cornerOffset; z = -cornerOffset; } // PARKING
      else if (i < 30) { x = -cornerOffset + (i - 20) * spaceSize + 1.1; z = -cornerOffset + 0.85; } // Properties 21-29
    }
    else { 
      // Fourth side (GO TO JAIL to GO)
      if (i === 30) { x = cornerOffset; z = -cornerOffset; } // GO TO JAIL
      else if (i < 40) { x = cornerOffset - 0.85; z = -cornerOffset + (i - 30) * spaceSize + 1.1; } // Properties 31-39
    }
    
    const property = properties.find(p => p.position === i);
    const color = getPropertyColor(property);
    
    const isCorner = i % 10 === 0; // Positions 0,10,20,30 are corners

    {/*
      // Jail space (position 10)
            <Suspense fallback={null}>
              <primitive 
                object={jailModel.clone()}
                position={[0, 0, 0]}
                scale={0.09}
                rotation={[0, Math.PI/2, 0]}
              />
            </Suspense>
      */}
    
    boardSpaces.push(
      <group 
        key={`space-${i}`} 
        position={[x, 0, z]} // Raise corners slightly
        onClick={() => onSpaceClick(property, i)}
        rotation={[0, 
          i < 10 ? 0 : 
          i < 20 ? -Math.PI/2 : 
          i < 30 ? Math.PI : 
          Math.PI/2, 
        0]}
      >
        {isCorner ? (
          i === 0 ? (
            // Special case for GO tile (position 0)
            <Suspense fallback={null}> {/* Add Suspense for model loading */}
              <primitive 
                object={goTileModel.clone()} 
                position={[-1.9, 0, 0.9]}
                scale={0.2}
                rotation={[0, Math.PI/2, 0]}
              />
            </Suspense>
          ) : i === 20 ? (
            // Parking space (position 20)
            <Suspense fallback={null}>
              <primitive 
                object={parkModel.clone()}
                position={[0.2, 0, 0.3]}
                scale={0.15}
                rotation={[0, 180, 0]}
              />
            </Suspense>
          ) : i === 30 ? (
            // Go to Jail space (position 30)
            <Suspense fallback={null}>
              <primitive 
                object={goJailModel.clone()}
                position={[0, 0, 0]}
                scale={0.09}
                rotation={[0, Math.PI/2, 0]}
              />
            </Suspense>
          ) : (
            // Other corner spaces - wider and taller
            <mesh position={[-0.55, 0, -0.55]} receiveShadow>
              <boxGeometry args={[spaceSize * 1.55, 0, spaceSize * 1.55]} />
              <meshStandardMaterial color={color || 'gray'} />
            </mesh>
          )
        ) : (
          // Regular property space
          <mesh position={[0, 0, -0.7]} receiveShadow>
            <boxGeometry args={[spaceSize, 0.1, 0.9]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )}
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
        {property?.houses > 0 && (
          <>
            {Array.from({length: Math.min(property.houses, 4)}).map((_, idx) => {
              const spacing = 0.8; // Increased from 0.5 to 0.8 for more space between buildings
              const xOffset = (idx - (Math.min(property.houses, 4) - 1) / 2) * spacing;
              const zOffset = idx % 2 === 0 ? 0 : 0.4; // Increased from 0.3 to 0.4 for more depth variation
              const model = idx % 2 === 0 ? houseModel.clone() : houseModel4.clone();
              
              // Apply consistent scaling based on house count
              const baseScale = 0.03; // Further reduced from 0.15 to make buildings smaller
              let scaleVariation = 0;
              if (property.houses === 2) {
                scaleVariation = idx % 2 === 0 ? 0.02 : 0.01; // Smaller variation
              } else if (property.houses > 2) {
                scaleVariation = idx * 0.003; // Smaller variation
              }
              const finalScale = baseScale + scaleVariation;
              model.scale.set(finalScale, finalScale, finalScale);
              
              return (
                <primitive
                  key={`house-${i}-${idx}`}
                  object={model}
                  position={[xOffset, 0, zOffset]}
                  rotation={[0, Math.PI/2, 0]}
                />
              );
            })}
            {property.houses >= 5 && (
              <primitive
                object={hotelModel.clone()}
                position={[0, 0, 0]}
                rotation={[0, Math.PI/2, 0]}
                scale={[0.001, 0.001, 0.001]}
              />
            )}
          </>
        )}
      </group>
    );
  }

  // Add center board logo - removed font property to avoid loading error
  const centerContent = (
    <group position={[0, 0.1, 0]}>
      <Text
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.5}
        color="#FF0000"
        anchorX="center"
        anchorY="middle"
      >
        DOMINOPOLY
      </Text>
    </group>
  );

  // Create player tokens - use memoization to prevent recreation on every render
  const playerTokens = React.useMemo(() => {
    return players.map((player, index) => {
      const position = player.position;
      let x = 0, z = 0;
      const cornerOffset = boardSize / 2 - spaceSize / 2;
      if (position < 10) { 
        if (position === 0) { x = cornerOffset; z = cornerOffset; } 
        else { x = cornerOffset - position * spaceSize - 1.1; z = cornerOffset - 0.85; }
      }
      else if (position < 20) { 
        if (position === 10) { x = -cornerOffset; z = cornerOffset; }
        else { x = -cornerOffset + spaceSize - 1; z = cornerOffset - (position - 10) * spaceSize - 1.1; }
      }
      else if (position < 30) { 
        if (position === 20) { x = -cornerOffset; z = -cornerOffset; }
        else { x = -cornerOffset + (position - 20) * spaceSize + 1.1; z = -cornerOffset + 0.85; }
      }
      else { 
        if (position === 30) { x = cornerOffset; z = -cornerOffset; }
        else { x = cornerOffset - 0.85; z = -cornerOffset + (position - 30) * spaceSize + 1.1; }
      }
      
      // Adjust vertical position slightly for the model base
      const yPos = 0.1; 

      // Calculate offset for players on the same space to avoid collision
      const playersOnSameSpace = players.filter(p => p.position === position);
      const numPlayersOnSpace = playersOnSameSpace.length;
      const playerIndexOnSpace = playersOnSameSpace.findIndex(p => p.id === player.id);

      let offsetX = 0;
      let offsetZ = 0;
      if (numPlayersOnSpace > 1) {
          const offsetRadius = 0.4; // Radius of the circle around the space center
          const angleStep = (2 * Math.PI) / numPlayersOnSpace; // Angle between players
          const angle = playerIndexOnSpace * angleStep;
          
          offsetX = Math.cos(angle) * offsetRadius;
          offsetZ = Math.sin(angle) * offsetRadius;
      }
      
      x += offsetX;
      z += offsetZ;

      // Ensure player and character exist before trying to access model
      if (!player || !player.character) {
        console.warn(`Player or character data missing for index ${index}`);
        return null; // Skip rendering if data is incomplete
      }

      // Calculate base rotation to face inward (opposite of board side rotation)
      let baseRotation = 0;
      if (position < 10) baseRotation = Math.PI;
      else if (position < 20) baseRotation = Math.PI/2;
      else if (position < 30) baseRotation = 0;
      else baseRotation = -Math.PI/2;
      
      // Add 45 degrees for corner positions
      const isCorner = position % 10 === 0;
      const cornerRotation = isCorner ? Math.PI/4 : 0;
      
      return (
        <group key={`player-${player.id}`} position={[x, yPos, z]} rotation={[0, baseRotation + cornerRotation, 0]}>
          <PlayerToken 
            modelPath={`/assets/3d/Players/${player.character.model}`}
            color={player.color}
            isCurrent={currentPlayer === index}
          />
          {currentPlayer === index && (
            <group position={[0, 1.5, 0]}>
              <RotatingIndicator />
            </group>
          )}
        </group>
      );
    });
  }, [players, currentPlayer, boardSize, spaceSize]); // Dependencies remain the same
  
  return (
    <group ref={boardRef}>
      {/* Board base - use stable reference to texture */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[boardSize, 0.1, boardSize]} />
        <meshStandardMaterial color="#E6DDC6" map={boardTexture} />
      </mesh>
      
      {/* Board inner area with lighter color */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[boardSize - spaceSize * 3.5, 0.1, boardSize - spaceSize * 3.5]} />
        <meshStandardMaterial color="#E6DDC6" />
      </mesh>

      {centerContent}
      {boardSpaces}
      {playerTokens}
    </group>
  );
};

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onRollDice,
  onEndTurn,
  onBuyProperty,
  onMovePlayer,
  onUpdateMoney,
  onUpdateJailStatus,
  onJailCard // Rename destructured prop here
}) => {
  const [diceValues, setDiceValues] = useState<[number, number]>([1, 1]);
  const [diceRolling, setDiceRolling] = useState(false);
  const [propertyForAction, setPropertyForAction] = useState<Property | null>(null);
  const [viewedProperty, setViewedProperty] = useState<Property | null>(null);

  const currentPlayerIndex = gameState.currentPlayer;
  const currentPlayer = gameState.players[currentPlayerIndex];
  const isBot = currentPlayer?.type === 'bot';
  const isMyTurn = currentPlayer && !isBot && currentPlayer.id === PeerService.getCurrentPeerId();
  
  useEffect(() => {
    // Only check for new actions if we don't already have one pending
    if (currentPlayer && !propertyForAction) {
      const propertyAtPosition = gameState.properties.find(
        p => p.position === currentPlayer.position
      );
      
      // Skip if we're not on a property or it's not our turn
      if (!propertyAtPosition || !gameState.hasDiceRolled || isBot || 
          currentPlayer.id !== PeerService.getCurrentPeerId()) {
        return;
      }

      const isSpecialCard = propertyAtPosition.type === 'surprise' || propertyAtPosition.type === 'box';
      const isCorner = propertyAtPosition.position === 10 || propertyAtPosition.position === 20 || propertyAtPosition.position === 30 || propertyAtPosition.position === 40 || propertyAtPosition.position === 0;
      const isBuyable = !isCorner && !isSpecialCard && !propertyAtPosition.owner && (propertyAtPosition.price !== undefined);
      
      if (isSpecialCard) {
        try {
          const stackType = propertyAtPosition.type === 'surprise' ? 'surprise' : 'box';
          const cardStack = gameState.cardStacks?.[stackType] ?? [];
          
          if (cardStack.length === 0) {
            console.warn('Empty card stack:', stackType);
            setPropertyForAction({
              ...propertyAtPosition,
              drawnCard: {
                id: 'default',
                type: stackType,
                title: 'No Cards Available',
                description: 'This card stack is empty',
                effect: {
                  type: 'money',
                  value: 0,
                  description: 'No effect'
                }
              }
            });
            return;
          }
        } catch (error) {
          console.error('Error drawing card:', error);
          setPropertyForAction(null);
        }
      } else {
        setPropertyForAction(isBuyable ? propertyAtPosition : null);
      }
    }
  }, [currentPlayer, gameState.properties, gameState.hasDiceRolled, isBot]);

  const handleRollDice = () => {
    setDiceRolling(true);
    let rollCount = 0;
    let latestDiceValues: [number, number] = [0, 0];
    const rollInterval = setInterval(() => {
      latestDiceValues = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
      setDiceValues(latestDiceValues);
      if (++rollCount === 4) {
        clearInterval(rollInterval);
        setDiceRolling(false);
        onRollDice(latestDiceValues);
      }
    }, 100);
  };

  const handleSpaceClick = useCallback((property: Property | null, position: number) => {
    if (property) {
      setViewedProperty(property);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 30, 0], rotation: [0, Math.PI, 0], fov: 50, near: 0.1, far: 2000 }}>
          <ambientLight intensity={1.5} />
          <Board 
            properties={gameState.properties as Property[]}
            players={gameState.players}
            currentPlayer={currentPlayerIndex}
            onSpaceClick={handleSpaceClick}
          />
          <OrbitControls enablePan enableZoom enableRotate minPolarAngle={0} maxPolarAngle={Math.PI / 2.5} />
        </Canvas>

        {/* Player Info Panel */}
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

        {/* Dice Controls */}
        <div className="absolute bottom-4 left-4 flex gap-4">
          <Card className="w-fit shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-2 gap-2">
                  {diceValues.map((value, index) => (
                    <div key={index} className={`w-12 h-12 bg-white rounded-lg border border-game-primary shadow flex items-center justify-center text-2xl font-bold ${diceRolling ? 'animate-dice-roll' : ''}`}>
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
                    <Dices size={16} /> Roll Dice
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
        </div>

        {/* Property Action Card (for buying/special cards) */}
        {propertyForAction && currentPlayer && isMyTurn && (
          <PropertyActionCard 
            property={propertyForAction}
            playerMoney={currentPlayer.money}
            onBuy={() => {
              onBuyProperty(propertyForAction.id);
              setPropertyForAction(null);
            }}
            onPass={() => setPropertyForAction(null)}
            onAcceptCard={() => {
              if (!propertyForAction?.drawnCard) {
                console.error('No drawn card found');
                return;
              }
              
              try {
                handleCardEffect(
                  propertyForAction.drawnCard,
                  currentPlayer,
                  (effect: CardEffectAction) => {
                    if (!effect) {
                      console.error('No effect provided');
                      return;
                    }
                    
                    switch(effect.type) {
                      case 'move':
                        if (effect.position === undefined) {
                          console.error('Missing position for move effect');
                          return;
                        }
                        onMovePlayer(effect.playerId, effect.position);
                        break;
                      case 'money':
                        if (effect.amount === undefined) {
                          console.error('Missing amount for money effect');
                          return;
                        }
                        onUpdateMoney(effect.playerId, effect.amount);
                        break;
                      case 'jail':
                        if (effect.jailed === undefined) {
                          console.error('Missing jailed status for jail effect');
                          return;
                        }
                        onUpdateJailStatus(effect.playerId, effect.jailed);
                        break;
                      case 'get_out_of_jail':
                        onJailCard(effect.playerId); // Rename function call
                        break;
                      default:
                        console.error('Unknown effect type:', effect);
                        return;
                    }
                    setPropertyForAction(null);
                  }
                );
              } catch (error) {
                console.error('Error processing card effect:', error);
              }
            }}
            open={!!propertyForAction}
            showActions={true}
          />
        )}

        {/* Property View Card (for viewing) */}
        {viewedProperty && (
          <PropertyActionCard
            property={viewedProperty}
            playerMoney={currentPlayer?.money || 0}
            onBuy={() => {}}
            onPass={() => setViewedProperty(null)}
            open={!!viewedProperty}
            showActions={false}
            isCardView={true}
          />
        )}

        {/* Current Player Info */}
        <div className="absolute top-4 left-4 space-y-2">
          <Badge className="px-3 py-1 text-md bg-game-primary text-white">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentPlayer?.color }} />
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
