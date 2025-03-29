import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, useTexture, useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dices, CircleDollarSign, Home, Bot } from 'lucide-react';
import { GameState, Player, Property } from '@/types/game';
import PlayerInfo from './PlayerInfo';
import PeerService from '@/services/PeerService';
import PropertyActionCard from './PropertyActionCard';
import { DEFAULT_RAILROAD_COLOR, DEFAULT_UTILITY_COLOR, getPropertyColor } from '@/lib/colors';
import { CardEffectAction, handleCardEffect } from '@/lib/card-effects';

interface GameBoardProps {
  gameState: GameState;
  onRollDice: (dice: [number, number]) => void;
  onEndTurn: () => void;
  onBuyProperty: (propertyId: string) => void;
  onMovePlayer: (playerId: string, newPosition: number) => void;
  onUpdateMoney: (playerId: string, amount: number) => void;
  onUpdateJailStatus: (playerId: string, jailed: boolean) => void;
  onGiveJailCard: (playerId: string) => void;
}

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
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  
  // Define texture loaders with error handling
  const textureLoader = new THREE.TextureLoader();
  const boardTexture = textureLoader.load('/board-texture.jpg', 
    () => setTexturesLoaded(true),
    undefined, 
    () => textureLoader.load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
  );
  
  // Load token models
  const ambulanceToken = useFBX('/assets/3d/Players/Ambulance.fbx');
  const busToken = useFBX('/assets/3d/Players/Bus_1.fbx');
  const taxiToken = useFBX('/assets/3d/Players/Taxi.fbx');
  const carToken = useFBX('/assets/3d/Players/Car_1_1.fbx');
  const truckToken = useFBX('/assets/3d/Players/Main_Truck_1.fbx');
  const policeToken = useFBX('/assets/3d/Players/Police.fbx');
  
  // Load building models
  const houseModel = useFBX('/assets/3d/Buildings/Building_1.fbx');
  const houseModel2 = useFBX('/assets/3d/Buildings/Building_5.fbx');
  const hotelModel = useFBX('/assets/3d/Buildings/Building_3.fbx');
  
  // Board dimensions
  const boardSize = 22;
  const spaceSize = 2;

  // Get property color based on its group
  const getPropertyColor = (property: Property | undefined) => {
    if (!property) return "#f0f0f0";
    if (property.group === "railroad") return DEFAULT_RAILROAD_COLOR;
    if (property.group === "utility") return DEFAULT_UTILITY_COLOR;
    return property.color || "#f0f0f0";
  };
  
  // Get corner space design (Go, Jail, Free Parking, Go to Jail)
  const getCornerSpace = (position: number) => {
    switch(position) {
      case 0: return { color: "#f0f0f0", text: "GO", textColor: "red" };
      case 10: return { color: "#f0f0f0", text: "JAIL", textColor: "black" };
      case 20: return { color: "#f0f0f0", text: "FREE PARKING", textColor: "red" };
      case 30: return { color: "#f0f0f0", text: "GO TO JAIL", textColor: "black" };
      default: return { color: "#f0f0f0", text: "", textColor: "black" };
    }
  };
  
  // Create token model based on player index
  const getPlayerToken = (index: number) => {
    switch(index % 6) {
      case 0: return carToken.clone();
      case 1: return ambulanceToken.clone();
      case 2: return busToken.clone();
      case 3: return truckToken.clone();
      case 4: return taxiToken.clone();
      default: return policeToken.clone();
    }
  };

  const boardSpaces = [];
  
  // Create board spaces
  for (let i = 0; i < 40; i++) {
    let x = 0, z = 0;
    const cornerOffset = boardSize / 2 - spaceSize / 2;
    
    // Position calculation for spaces around the board
    if (i < 10) { x = cornerOffset - i * spaceSize; z = cornerOffset; }
    else if (i < 20) { x = -cornerOffset; z = cornerOffset - (i - 10) * spaceSize; }
    else if (i < 30) { x = -cornerOffset + (i - 20) * spaceSize; z = -cornerOffset; }
    else { x = cornerOffset; z = -cornerOffset + (i - 30) * spaceSize; }
    
    const property = properties.find(p => p.position === i);
    const isCorner = [0, 10, 20, 30].includes(i);
    const cornerInfo = isCorner ? getCornerSpace(i) : null;
    const color = cornerInfo ? cornerInfo.color : getPropertyColor(property);
    
    // Create card-like space with colored band at top (like Monopoly properties)
    boardSpaces.push(
      <group 
        key={`space-${i}`} 
        position={[x, 0, z]}
        onClick={() => onSpaceClick(property, i)}
      >
        {/* Base space */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[spaceSize, 0.1, spaceSize]} />
          <meshStandardMaterial color="#f9f9f9" />
        </mesh>
        
        {/* Colored property band (for non-corner spaces) */}
        {!isCorner && property && property.group && (
          <mesh position={[0, 0.05, -0.3]} receiveShadow>
            <boxGeometry args={[spaceSize, 0.1, 0.6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )}
        
        {/* Corner space design */}
        {isCorner && cornerInfo && (
          <Text
            position={[0, 0.2, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.4}
            color={cornerInfo.textColor}
            anchorX="center"
            anchorY="middle"
          >
            {cornerInfo.text}
          </Text>
        )}
        
        {/* Property name */}
        {!isCorner && (
          <Text
            position={[0, 0.15, 0.2]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.2}
            color="black"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.8}
          >
            {property?.name || `Space ${i}`}
          </Text>
        )}
        
        {/* Property price */}
        {property && property.price && (
          <Text
            position={[0, 0.15, 0.6]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.15}
            color="black"
            anchorX="center"
            anchorY="middle"
          >
            ${property.price}
          </Text>
        )}
        
        {/* Houses and hotels */}
        {property?.houses > 0 && (
          <>
            {property.houses < 5 ? (
              // Houses
              Array.from({length: property.houses}).map((_, idx) => {
                const spacing = 0.35;
                const xOffset = (idx - (property.houses - 1) / 2) * spacing;
                const model = idx % 2 === 0 ? houseModel.clone() : houseModel2.clone();
                model.scale.set(0.02, 0.02, 0.02);
                
                return (
                  <primitive
                    key={`house-${i}-${idx}`}
                    object={model}
                    position={[xOffset, 0.2, -0.3]}
                    rotation={[0, Math.PI/2, 0]}
                    castShadow
                  />
                );
              })
            ) : (
              // Hotel
              <primitive
                object={hotelModel.clone()}
                position={[0, 0.2, -0.3]}
                rotation={[0, Math.PI/2, 0]}
                scale={[0.025, 0.025, 0.025]}
                castShadow
              />
            )}
          </>
        )}
      </group>
    );
  }
  
  // Create player tokens
  const playerTokens = players.map((player, index) => {
    const position = player.position;
    let x = 0, z = 0;
    const cornerOffset = boardSize / 2 - spaceSize / 2;
    
    // Position calculation for player tokens
    if (position < 10) { x = cornerOffset - position * spaceSize; z = cornerOffset; }
    else if (position < 20) { x = -cornerOffset; z = cornerOffset - (position - 10) * spaceSize; }
    else if (position < 30) { x = -cornerOffset + (position - 20) * spaceSize; z = -cornerOffset; }
    else { x = cornerOffset; z = -cornerOffset + (position - 30) * spaceSize; }
    
    // Offset tokens so they don't overlap
    x += (index % 3) * 0.3 - 0.3;
    z += Math.floor(index / 3) * 0.3 - 0.3;
    
    const tokenModel = getPlayerToken(index);
    tokenModel.scale.set(0.05, 0.05, 0.05);
    
    if (currentPlayer === index) {
      // Highlight current player's token
      return (
        <group key={`player-${player.id}`} position={[x, 0.4, z]}>
          <primitive object={tokenModel} castShadow />
          <pointLight 
            position={[0, 0.5, 0]}
            color={player.color}
            intensity={5}
            distance={2}
          />
        </group>
      );
    }
    
    return (
      <primitive 
        key={`player-${player.id}`} 
        object={tokenModel}
        position={[x, 0.4, z]}
        castShadow
      />
    );
  });
  
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
        MONOPOLY
      </Text>
    </group>
  );
  
  return (
    <group ref={boardRef}>
      {/* Board base */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[boardSize, 0.1, boardSize]} />
        <meshStandardMaterial color="#E6DDC6" map={boardTexture} />
      </mesh>
      
      {/* Board inner area with lighter color */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[boardSize - spaceSize * 2, 0.1, boardSize - spaceSize * 2]} />
        <meshStandardMaterial color="#E6DDC6" />
      </mesh>
      
      {boardSpaces}
      {playerTokens}
      {centerContent}
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
  onGiveJailCard
}) => {
  const [diceValues, setDiceValues] = useState<[number, number]>([1, 1]);
  const [diceRolling, setDiceRolling] = useState(false);
  const [propertyForAction, setPropertyForAction] = useState<Property | null>(null);
  const [viewedProperty, setViewedProperty] = useState<Property | null>(null);

  const currentPlayerIndex = gameState.currentPlayer;
  const currentPlayer = gameState.players[currentPlayerIndex];
  const isBot = currentPlayer?.type === 'bot';
  const isMyTurn = currentPlayer && !isBot && currentPlayer.id === PeerService.getCurrentPeerId();
  
  console.log('propertyForAction: ', propertyForAction);

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

      const isBuyable = !propertyAtPosition.owner && (propertyAtPosition.price !== undefined);
      const isSpecialCard = propertyAtPosition.type === 'surprise' || propertyAtPosition.type === 'box';
      
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

  const handleSpaceClick = (property: Property | null) => {
    if (property) {
      setViewedProperty(property);
    }
  };

  console.log('pro: ', gameState.properties);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 relative">
        <Canvas shadows camera={{ position: [0, 30, 0], fov: 50, near: 0.1, far: 2000 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} castShadow intensity={0.8} />
          <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} castShadow intensity={1} />
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
              console.log('here: ', propertyForAction);
              
              if (!propertyForAction?.drawnCard) {
                console.error('No drawn card found');
                return;
              }

              console.log('Processing card:', propertyForAction.drawnCard);
              
              try {
                handleCardEffect(
                  propertyForAction.drawnCard,
                  currentPlayer,
                  (effect: CardEffectAction) => {
                    if (!effect) {
                      console.error('No effect provided');
                      return;
                    }

                    console.log('Executing effect:', effect);
                    
                    switch(effect.type) {
                      case 'move':
                        if (effect.position === undefined) {
                          console.error('Missing position for move effect');
                          return;
                        }
                        console.log('Moving player to position', effect.position);
                        onMovePlayer(effect.playerId, effect.position);
                        break;
                      case 'money':
                        if (effect.amount === undefined) {
                          console.error('Missing amount for money effect');
                          return;
                        }
                        console.log('Updating money by', effect.amount);
                        onUpdateMoney(effect.playerId, effect.amount);
                        break;
                      case 'jail':
                        if (effect.jailed === undefined) {
                          console.error('Missing jailed status for jail effect');
                          return;
                        }
                        console.log('Setting jail status to', effect.jailed);
                        onUpdateJailStatus(effect.playerId, effect.jailed);
                        break;
                      case 'get_out_of_jail':
                        console.log('Giving get out of jail card');
                        onGiveJailCard(effect.playerId);
                        break;
                      default:
                        console.error('Unknown effect type:', effect);
                        return;
                    }
                    setPropertyForAction(null);
                    console.log('is this triggeting');
                    
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
