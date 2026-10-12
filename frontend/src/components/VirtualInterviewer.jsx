import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, Html } from '@react-three/drei';
import Avatar from './Avatar';

const Desk = () => (
  <group position={[0, -0.2, 0.6]}>
    {/* Main Table Top: Sleek dark obsidian finish matching cosmic violet theme */}
    <mesh receiveShadow>
      <boxGeometry args={[3.5, 0.05, 1.5]} />
      <meshStandardMaterial color="#0f1424" roughness={0.22} metalness={0.65} />
    </mesh>

    {/* Subtle glowing violet accent strip facing camera */}
    <mesh position={[0, 0.015, 0.74]}>
      <boxGeometry args={[3.5, 0.018, 0.02]} />
      <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={0.65} roughness={0.15} />
    </mesh>

    {/* Rear Accent Trim */}
    <mesh position={[0, 0.015, -0.74]}>
      <boxGeometry args={[3.5, 0.018, 0.02]} />
      <meshStandardMaterial color="#4f46e5" emissive="#4338ca" emissiveIntensity={0.4} roughness={0.2} />
    </mesh>

    {/* Table Legs: Sleek dark titanium chrome */}
    {[-1.6, 1.6].flatMap(x => [-0.6, 0.6].map(z => (
      <mesh key={`${x}-${z}`} position={[x, -0.6, z]}>
        <boxGeometry args={[0.08, 1.2, 0.08]} />
        <meshStandardMaterial color="#1e2238" roughness={0.3} metalness={0.85} />
      </mesh>
    )))}
  </group>
);

const MacBook = () => (
  <group position={[0, -0.17, 0.3]} rotation={[0, Math.PI, 0]}>
    <mesh position={[0, 0.01, 0]}>
      <boxGeometry args={[0.7, 0.015, 0.5]} />
      <meshStandardMaterial color="#d1d5db" roughness={0.2} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.02, 0.05]}>
      <boxGeometry args={[0.6, 0.005, 0.25]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
    <mesh position={[0, 0.25, -0.25]} rotation={[-0.2, 0, 0]}>
      <boxGeometry args={[0.7, 0.5, 0.01]} />
      <meshStandardMaterial color="#d1d5db" roughness={0.2} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.25, -0.245]} rotation={[-0.2, 0, 0]}>
      <boxGeometry args={[0.68, 0.48, 0.01]} />
      <meshStandardMaterial color="#000" />
    </mesh>
    <mesh position={[0, 0.25, -0.24]} rotation={[-0.2, 0, 0]}>
      <planeGeometry args={[0.64, 0.44]} />
      <meshBasicMaterial color="#0f172a" />
    </mesh>
  </group>
);

const MinimalAvatarLoader = ({ text = "Initializing AI Interviewer..." }) => (
  <div className="minimal-avatar-loader">
    <div className="ai-loader-rings">
      <div className="ai-loader-ring outer" />
      <div className="ai-loader-ring inner" />
      <div className="ai-loader-pulse" />
    </div>
    <p className="ai-loader-text">{text}</p>
  </div>
);

const VirtualInterviewer = ({
  isSpeaking = false,
  isWaving = false,
  className = "hosted-canvas",
  avatarY = -1.45,
  avatarPath = '/model.glb',
  avatarScale = 1.2,
  avatarOffset = [0, 0, 0],
  wavePose,
  cameraPos = [0, 1.15, 2.7]
}) => (
  <div className={className}>
    <Suspense fallback={<MinimalAvatarLoader text="Loading 3D Environment..." />}>
      <Canvas camera={{ position: cameraPos, fov: 33 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 5, 5]} intensity={1.5} castShadow />
        <pointLight position={[-2, 1, 2]} intensity={0.6} color="#818cf8" />
        <Environment preset="city" />
        <Desk />
        <MacBook />
        <Suspense fallback={<Html center><MinimalAvatarLoader text="Loading 3D Avatar..." /></Html>}>
          <Avatar
            isSpeaking={isSpeaking}
            isWaving={isWaving}
            avatarY={avatarY}
            avatarPath={avatarPath}
            avatarScale={avatarScale}
            avatarOffset={avatarOffset}
            wavePose={wavePose}
          />
        </Suspense>
        <ContactShadows position={[0, -2.5, 0]} opacity={0.6} scale={15} blur={2} far={5} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 2.1}
          minAzimuthAngle={-Math.PI / 8}
          maxAzimuthAngle={Math.PI / 8}
        />
      </Canvas>
    </Suspense>
  </div>
);

export { MinimalAvatarLoader };
export default VirtualInterviewer;
