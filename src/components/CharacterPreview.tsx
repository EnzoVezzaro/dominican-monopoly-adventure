import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useFBX } from '@react-three/drei';
import * as THREE from 'three'; // Import THREE if needed for fallback

interface CharacterPreviewProps {
  modelPath: string;
  scalePreview: number; // Add scalePreview prop
}

// Component for loading GLB/GLTF models in preview
const GltfPreviewModel: React.FC<{ path: string; scale: number }> = ({ path, scale }) => {
  const gltf = useGLTF(path);
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene]);
  // Use the passed scale prop
  return <primitive object={scene} scale={scale} />;
};

// Component for loading FBX models in preview
const FbxPreviewModel: React.FC<{ path: string; scale: number }> = ({ path, scale }) => {
  const fbx = useFBX(path);
  const scene = useMemo(() => fbx.clone(), [fbx]);
  return <primitive object={scene} scale={scale} />;
};


// Main Model component decides which loader to use for preview
const Model: React.FC<{ path: string; scale: number }> = ({ path, scale }) => {
  const extension = path.split('.').pop()?.toLowerCase();

  if (extension === 'glb' || extension === 'gltf') {
    return <GltfPreviewModel path={path} scale={scale} />; // Pass scale down
  } else if (extension === 'fbx') {
    return <FbxPreviewModel path={path} scale={scale} />; // Pass scale down
  } else {
    console.warn(`Unsupported model format for preview path: ${path}`);
    // Render fallback or null
    return (
        <mesh>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshStandardMaterial color="red" />
        </mesh>
    ); // Simple red box as an error indicator
  }
};


const CharacterPreview: React.FC<CharacterPreviewProps> = ({ modelPath, scalePreview }) => { // Destructure scalePreview
  return (
    // Moved camera closer again (Z from 0.2 to 0.15)
    <Canvas camera={{ position: [0, 0.1, 0.1], fov: 50 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <Suspense fallback={null}> {/* Simple fallback, can be a spinner or placeholder mesh */}
        <Model path={modelPath} scale={scalePreview} /> {/* Pass scalePreview to Model */}
      </Suspense>
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} // Limit vertical rotation
        maxPolarAngle={3 * Math.PI / 4} // Limit vertical rotation
        autoRotate // Gently rotate the model
        autoRotateSpeed={2} // Adjust rotation speed
      />
    </Canvas>
  );
};

export default CharacterPreview;
