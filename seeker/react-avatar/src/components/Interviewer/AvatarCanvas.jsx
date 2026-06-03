import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AvatarModel } from './AvatarModel';

// Simple fallback indicator while GLB model loads
function CanvasLoader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="rgba(6, 182, 212, 0.2)" wireframe />
    </mesh>
  );
}

export function AvatarCanvas({ state, getRMSVolume, modelUrl }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0.4, 3.2], fov: 40 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lights Setup */}
        <ambientLight intensity={0.65} color="#ffffff" />
        
        {/* Key Light */}
        <directionalLight
          position={[2, 4, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />
        
        {/* Back Light / Rim Light (creates nice volumetric glow around shoulders) */}
        <directionalLight
          position={[-2, 2, -4]}
          intensity={0.8}
          color="#06b6d4" // Holographic blue color rim light matching theme
        />
        
        {/* Fill Light */}
        <directionalLight
          position={[-3, 1, 2]}
          intensity={0.4}
          color="#a5f3fc"
        />

        {/* Loaded 3D Model */}
        <Suspense fallback={<CanvasLoader />}>
          <AvatarModel 
            state={state} 
            getRMSVolume={getRMSVolume} 
            modelUrl={modelUrl} 
          />
        </Suspense>

        {/* Restrict camera controls so the user doesn't turn the head backwards */}
        <OrbitControls 
          enableZoom={true} 
          maxDistance={5}
          minDistance={1.5}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 + 0.1} // Stop camera rotating below floor level
          minPolarAngle={Math.PI / 3}
          maxAzimuthAngle={Math.PI / 8}
          minAzimuthAngle={-Math.PI / 8}
        />
      </Canvas>
    </div>
  );
}
export default AvatarCanvas;
