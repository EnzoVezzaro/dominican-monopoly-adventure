import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import PropertyActionCard from './PropertyActionCard';
import { getPropertyColor } from '@/lib/colors';
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
  const fallbackTexture = new THREE.TextureLoader().load(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  );
  
  const [textureLoadFailed, setTextureLoadFailed] = useState(false);
  
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      '/board-texture.jpg',
      () => setTextureLoadFailed(false),
      undefined,
      () => setTextureLoadFailed(true)
    );
  }, []);
  
  const boardTexture = textureLoadFailed ? fallbackTexture : new THREE.TextureLoader().load('/board-texture.jpg');
  const boardSpaces = [];
  const boardSize = 10;
  const spaceSize = 1;
  
  for (let i = 0; i < 40; i++) {
    let x = 0, z = 0;
    if (i < 10) { x = 5 - i * spaceSize; z = 5; }
    else if (i < 20) { x = -5; z = 5 - (i - 10) * spaceSize; }
    else if (i < 30) { x = -5 + (i - 20) * spaceSize; z = -5; }
    else { x = 5; z = -5 + (i - 30) * spaceSize; }
    
    const property = properties.find(p => p.position === i);
    const color = getPropertyColor(property);
    
    boardSpaces.push(
      <group 
        key={`space-${i}`} 
        position={[x, 0, z]}
        onClick={() => onSpaceClick(property, i)}
      >
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
    let x = 0, z = 0;
    if (position < 10) { x = 5 - position * spaceSize; z = 5; }
    else if (position < 20) { x = -5; z = 5 - (position - 10) * spaceSize; }
    else if (position < 30) { x = -5 + (position - 20) * spaceSize; z = -5; }
    else { x = 5; z = -5 + (position - 30) * spaceSize; }
    
    x += (index % 3) * 0.25 - 0.25;
    z += Math.floor(index / 3) * 0.25 - 0.25;
    
    return (
      <mesh key={`player-${player.id}`} position={[x, 0.4, z]} castShadow>
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
  onBuyProperty,
  onMovePlayer,
  onUpdateMoney,
  onUpdateJailStatus,
  onGiveJailCard
}) => {
  
  // Ensure card stacks are properly initialized
  useEffect(() => {
    console.log('game state: ', gameState);
    
    if (!gameState.cardStacks?.suprise || !gameState.cardStacks?.box) {
      console.error('Card stacks not initialized properly');
      return;
    }
    console.log('Card stacks initialized:', {
      suprise: gameState.cardStacks.suprise.length,
      box: gameState.cardStacks.box.length
    });
  }, [gameState.cardStacks]);
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
    if (currentPlayer) {
      const propertyAtPosition = gameState.properties.find(
        p => p.position === currentPlayer.position
      );
      const isBuyable = !!propertyAtPosition && !propertyAtPosition.owner && 
        (propertyAtPosition.price !== undefined) && gameState.hasDiceRolled && 
        !isBot && currentPlayer.id === PeerService.getCurrentPeerId();
      const isSpecialCard = propertyAtPosition?.type === 'suprise' || propertyAtPosition?.type === 'box';
      
      if (isSpecialCard && gameState.hasDiceRolled && !isBot) {
        try {
          const stackType = propertyAtPosition.type === 'suprise' ? 'suprise' : 'box';
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

          const drawnCard = {
            ...propertyAtPosition,
            drawnCard: {
              ...cardStack[0],
              effect: cardStack[0].effect
            }
          };
          console.log('Drawn card:', drawnCard);
          setPropertyForAction(drawnCard);
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
        onRollDice([4,0]);
      }
    }, 100);
  };

  const handleSpaceClick = (property: Property | null) => {
    if (property) {
      setViewedProperty(property);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 relative">
        <Canvas shadows camera={{ position: [0, 15, 0], fov: 50, near: 0.1, far: 1000 }}>
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
                        console.error('Unknown effect type:', effect.type);
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
