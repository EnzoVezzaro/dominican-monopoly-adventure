import React, { Suspense } from 'react';
import { useFBX } from '@react-three/drei';
import * as THREE from 'three';

interface PlayerTokenProps {
  modelPath: string;
  color: string; // To tint the model or use as fallback
  isCurrent: boolean;
}

// Helper component to load and display the model
const Model: React.FC<{ path: string; color: string; isCurrent: boolean }> = ({ path, color, isCurrent }) => {
  const fbx = useFBX(path);

  // Apply color tinting or emissive effect if needed
  // Note: This might not work perfectly on all FBX materials.
  // It's often better if models are designed with materials that can be easily colored.
  fbx.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Option 1: Simple color overlay (might look flat)
      // child.material.color.set(color);

      // Option 2: Emissive for current player (glow)
      if (isCurrent) {
        // Ensure material is MeshStandardMaterial or similar that supports emissive
        if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial) {
          child.material.emissive.set(color);
          child.material.emissiveIntensity = 0.6; // Adjust intensity
        } else {
           // Fallback: just set color if emissive isn't supported
           child.material.color?.set(color);
        }
      } else {
         // Reset emissive if not current
         if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial) {
            child.material.emissive.set(0x000000); // Black (no emission)
            child.material.emissiveIntensity = 0;
         }
         // Ensure base color is set correctly if needed (might depend on original model)
         // child.material.color?.set(0xffffff); // Example: reset to white if needed
      }
      child.material.needsUpdate = true;
    }
  });

  // Scale the model appropriately for the board space
  // This scale might need significant adjustment based on original model sizes
  // Increased scale from 0.005 to 0.01
  return <primitive object={fbx} scale={0.1} rotation={[0, Math.PI, 0]} />; 
};

const PlayerToken: React.FC<PlayerTokenProps> = ({ modelPath, color, isCurrent }) => {
  return (
    <Suspense fallback={ // Simple sphere fallback while loading
      <mesh castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color={color} emissive={isCurrent ? color : undefined} emissiveIntensity={0.5} />
      </mesh>
    }>
      <Model path={modelPath} color={color} isCurrent={isCurrent} />
    </Suspense>
  );
};

export default PlayerToken;
