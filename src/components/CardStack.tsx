import React from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface CardStackProps {
  position: [number, number, number];
  rotation?: number;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  cardCount: number;
  onCardDrawn?: () => void;
}

const CardStack: React.FC<CardStackProps> = ({ 
  position,
  rotation = 0,
  name,
  primaryColor,
  secondaryColor,
  cardCount,
  onCardDrawn 
}) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group position={[0, 0.1, 0]}>
        {/* Card base */}
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.1, 2]} />
          <meshStandardMaterial color={primaryColor} />
        </mesh>
        {/* Stack of cards - limited to 10 visually */}
        {[...Array(Math.min(cardCount, 10))].map((_, i) => (
          <mesh 
            key={`card-${i}`} 
            position={[0, 0.05 + i*0.02, 0]} 
            rotation={[0, i % 2 ? -0.05 : 0.05, 0]} // Alternate slant direction
          >
            <boxGeometry args={[1.4, 0.005, 1.9]} />
            <meshStandardMaterial color={i % 2 ? secondaryColor : primaryColor} />
          </mesh>
        ))}
      </group>
      <Text
        position={[0, 1.5, 0]}
        color="white"
        fontSize={0.8}
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
};

export default CardStack;
