import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useFBX } from '@react-three/drei';

interface CharacterPreviewProps {
  modelPath: string;
}

// Helper component to load and display the model
const Model: React.FC<{ path: string }> = ({ path }) => {
  const fbx = useFBX(path);
  // Scale the model down significantly to fit in the small preview area
  // You might need to adjust the scale factor based on your models' original sizes
  return <primitive object={fbx} scale={0.005} />;
};

const CharacterPreview: React.FC<CharacterPreviewProps> = ({ modelPath }) => {
  return (
    // Moved camera closer again (Z from 0.2 to 0.15)
    <Canvas camera={{ position: [0, 0.1, 0.1], fov: 50 }}> 
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <Suspense fallback={null}> {/* Simple fallback, can be a spinner or placeholder mesh */}
        <Model path={modelPath} />
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
