import React, { Suspense, useMemo } from 'react';
import { useGLTF, useFBX } from '@react-three/drei';
import * as THREE from 'three';

interface PlayerTokenProps {
  modelPath: string;
  color: string; // Used for fallback or potentially minor tinting if needed
  scale: number; // Add scale prop for the token size
  boardPosition: { x: number; y: number; z: number }; // Add board position
}

// Helper function to apply any necessary material adjustments (optional)
// For now, we won't apply color tints to avoid overriding model textures.
// This function remains as a placeholder if future adjustments are needed.
const applyMaterialChanges = (object: THREE.Object3D, color: string) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Example: If you wanted to force a basic color tint:
      // if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial) {
      //   child.material.color.set(color);
      // } else {
      //    child.material.color?.set(color);
      // }
      // child.material.needsUpdate = true;
    }
  });
};


// Component for loading GLB/GLTF models
const GltfModel: React.FC<{ path: string; color: string; scale: number }> = ({ path, color, scale }) => { // Add scale prop
  const gltf = useGLTF(path);
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene]); // Clone to avoid modifying the original cache

  // Apply material changes (currently does nothing)
  applyMaterialChanges(scene, color);

  // Scale the model using passed scale value
  return <primitive object={scene} scale={scale} />;
};

// Component for loading FBX models
const FbxModel: React.FC<{ path: string; color: string; scale: number }> = ({ path, color, scale }) => { // Add scale prop
  const fbx = useFBX(path);
  const scene = useMemo(() => fbx.clone(), [fbx]); // Clone to avoid modifying the original cache

  // Apply material changes (currently does nothing)
  applyMaterialChanges(scene, color);

  // Scale the model using passed scale value
  return <primitive object={scene} scale={scale} />;
};


// Main Model component decides which loader to use
const Model: React.FC<{ path: string; color: string; scale: number }> = ({ path, color, scale }) => { // Add scale prop
  const extension = path.split('.').pop()?.toLowerCase();

  if (extension === 'glb' || extension === 'gltf') {
    return <GltfModel path={path} color={color} scale={scale} />; // Pass scale down
  } else if (extension === 'fbx') {
    return <FbxModel path={path} color={color} scale={scale} />; // Pass scale down
  } else {
    console.warn(`Unsupported model format for path: ${path}`);
    // Render fallback or null
    return (
        <mesh castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="red" />
            <primitive object={new THREE.AxesHelper(1)} />
        </mesh>
    ); // Simple red box as an error indicator
  }
};


const PlayerToken: React.FC<PlayerTokenProps> = ({ modelPath, color, scale, boardPosition }) => { // Destructure boardPosition
  return (
    <Suspense fallback={ // Simple sphere fallback while loading
      <mesh castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        {/* Removed emissive based on isCurrent */}
        <meshStandardMaterial color={color} />
      </mesh>
    }>
      {/* Pass scale prop down and apply position */}
      <group position={[boardPosition.x, boardPosition.y, boardPosition.z]}>
        <Model path={modelPath} color={color} scale={scale} />
      </group>
    </Suspense>
  );
};

export default PlayerToken;
