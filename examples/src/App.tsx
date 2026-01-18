import { useState, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { extend } from "@react-three/fiber";
import { VFXParticles, VFXEmitter, useVFXEmitter, Appearance, EmitterShape, Lighting } from "@vfx/particles";

type DemoType = "fire" | "magic" | "burst" | "smoke" | "geometry" | "attract";

const demos: { id: DemoType; label: string }[] = [
  { id: "fire", label: "Fire" },
  { id: "magic", label: "Magic Orb" },
  { id: "burst", label: "Burst" },
  { id: "smoke", label: "Smoke" },
  { id: "geometry", label: "3D Shapes" },
  { id: "attract", label: "Vortex" },
];

function FireDemo() {
  return (
    <VFXParticles
      maxParticles={3000}
      position={[0, -1, 0]}
      size={[0.3, 0.8]}
      colorStart={["#ff6600", "#ffcc00", "#ff0000"]}
      colorEnd={["#ff0000", "#330000"]}
      fadeSize={[1, 0.2]}
      fadeOpacity={[1, 0]}
      gravity={[0, 0.5, 0]}
      lifetime={[0.4, 0.8]}
      direction={[[-0.3, 0.3], [0.5, 1], [-0.3, 0.3]]}
      speed={[0.01, 0.05]}
      friction={{ intensity: 0.03, easing: "easeOut" }}
      appearance={Appearance.GRADIENT}
      intensity={10}
    />
  );
}

function MagicOrbDemo() {
  return (
    <VFXParticles
      maxParticles={500}
      position={[0, 0, 0]}
      size={[0.1, 0.2]}
      delay={0.02}
      colorStart={["#00ffff", "#0088ff", "#ffffff"]}
      colorEnd={["#0044aa", "#002266"]}
      fadeSize={[1, 0.5]}
      fadeOpacity={[1, 0]}
      gravity={[0, 0, 0]}
      lifetime={[2, 3]}
      direction={[[0, 0], [0, 0], [0, 0]]}
      speed={0}
      appearance={Appearance.CIRCULAR}
      intensity={8}
      emitterShape={EmitterShape.SPHERE}
      emitterRadius={[0.5, 1]}
      turbulence={{
        intensity: 0.8,
        frequency: 1.5,
        speed: 0.5,
      }}
    />
  );
}

function BurstDemo() {
  const burstRef = useRef<{ burst: (count?: number) => void }>(null);

  return (
    <>
      <VFXParticles
        name="burst"
        maxParticles={2000}
        autoStart={false}
        position={[0, 0, 0]}
        size={[0.1, 0.3]}
        colorStart={["#ff00ff", "#ffaa00", "#00ffaa"]}
        colorEnd={["#440044", "#442200", "#004422"]}
        fadeSize={[1, 0.3]}
        fadeOpacity={[1, 0]}
        gravity={[0, -2, 0]}
        lifetime={[1, 2]}
        emitterShape={EmitterShape.SPHERE}
        emitterRadius={[0, 0.5]}
        startPositionAsDirection
        speed={[0.3, 0.5]}
        appearance={Appearance.GRADIENT}
        intensity={5}
      />
      <VFXEmitter
        ref={burstRef}
        name="burst"
        emitCount={200}
        delay={1}
        autoStart
        loop
      />
    </>
  );
}

function SmokeDemo() {
  return (
    <VFXParticles
      maxParticles={300}
      position={[0, -1, 0]}
      size={[0.3, 0.6]}
      delay={0.05}
      colorStart={["#666666", "#888888", "#aaaaaa"]}
      colorEnd={["#333333", "#222222"]}
      fadeSize={[0.5, 1.5]}
      fadeOpacity={[0.6, 0]}
      gravity={[0, 0.5, 0]}
      lifetime={[3, 5]}
      direction={[[-0.1, 0.1], [0.3, 0.5], [-0.1, 0.1]]}
      speed={[0.02, 0.05]}
      friction={{ intensity: 0.005, easing: "linear" }}
      appearance={Appearance.GRADIENT}
      intensity={1}
      emitterShape={EmitterShape.DISK}
      emitterRadius={[0, 0.3]}
      emitterDirection={[0, 1, 0]}
      turbulence={{
        intensity: 1.2,
        frequency: 0.8,
        speed: 0.3,
      }}
    />
  );
}

function GeometryDemo() {
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

  return (
    <VFXParticles
      geometry={boxGeometry}
      maxParticles={200}
      position={[0, 2, 0]}
      delay={0.2}
      size={[0.1, 0.2]}
      colorStart={["#ff00ff", "#aa00ff", "#ff66ff"]}
      colorEnd={["#440044", "#220022"]}
      fadeSize={[1, 1]}
      fadeOpacity={[1, 0]}
      gravity={[0, -3, 0]}
      lifetime={[2, 4]}
      direction={[[-0.5, 0.5], [0, 0.3], [-0.5, 0.5]]}
      speed={[0.05, 0.1]}
      friction={{ intensity: 0.02, easing: "easeOut" }}
      rotation={[
        [0, Math.PI * 2],
        [0, Math.PI * 2],
        [0, Math.PI * 2],
      ]}
      rotationSpeed={[
        [1, 3],
        [1, 3],
        [1, 3],
      ]}
      lighting={Lighting.STANDARD}
      intensity={3}
      collision={{
        plane: { y: -1 },
        bounce: 0.6,
        friction: 0.9,
        die: false,
      }}
    />
  );
}

function AttractDemo() {
  return (
    <VFXParticles
      maxParticles={400}
      position={[0, 0, 0]}
      size={[0.08, 0.15]}
      delay={0.03}
      colorStart={["#00ffaa", "#66ffcc", "#ffffff"]}
      colorEnd={["#006644", "#003322"]}
      fadeSize={[1, 0.5]}
      fadeOpacity={[1, 0]}
      gravity={[0, 0, 0]}
      lifetime={[2, 4]}
      friction={{ intensity: 0, easing: "linear" }}
      appearance={Appearance.CIRCULAR}
      intensity={6}
      emitterShape={EmitterShape.SPHERE}
      emitterRadius={[1.5, 2.5]}
      attractToCenter
      turbulence={{
        intensity: 0.5,
        frequency: 2,
        speed: 0.8,
      }}
    />
  );
}

function Scene({ activeDemo }: { activeDemo: DemoType }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, 2, 0]} color="#ff6600" intensity={2} />
      <pointLight position={[3, 2, 0]} color="#0066ff" intensity={2} />

      {activeDemo === "fire" && <FireDemo />}
      {activeDemo === "magic" && <MagicOrbDemo />}
      {activeDemo === "burst" && <BurstDemo />}
      {activeDemo === "smoke" && <SmokeDemo />}
      {activeDemo === "geometry" && <GeometryDemo />}
      {activeDemo === "attract" && <AttractDemo />}

      <mesh position={[0, -1.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#111118" metalness={0.8} roughness={0.4} />
      </mesh>

      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={3}
        maxDistance={15}
      />
    </>
  );
}

function App() {
  const [activeDemo, setActiveDemo] = useState<DemoType>("fire");

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Canvas
          shadows
          camera={{ position: [0, 2, 6], fov: 50 }}
          gl={async (props) => {
            extend(THREE);
            const renderer = new THREE.WebGPURenderer(props as THREE.WebGPURendererParameters);
            await renderer.init();
            return renderer;
          }}
        >
          <Suspense fallback={null}>
            <Scene activeDemo={activeDemo} />
          </Suspense>
        </Canvas>
      </div>

      <div className="ui-overlay">
        <section className="hero-section">
          <h1 className="hero-title">VFX Particles</h1>
          <p className="hero-subtitle">
            High-performance GPU-accelerated particle system for Three.js WebGPU.
            Built with compute shaders for maximum performance.
          </p>
          <div className="demo-controls">
            {demos.map((demo) => (
              <button
                key={demo.id}
                className={`demo-btn ${activeDemo === demo.id ? "active" : ""}`}
                onClick={() => setActiveDemo(demo.id)}
              >
                {demo.label}
              </button>
            ))}
          </div>
        </section>

        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">GPU Compute</h3>
              <p className="feature-desc">
                All simulation runs on the GPU using WebGPU compute shaders.
                Handle millions of particles at 60fps.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3 className="feature-title">Flexible Rendering</h3>
              <p className="feature-desc">
                Sprites, custom 3D geometry, PBR materials, shadows, and custom TSL shaders.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌀</div>
              <h3 className="feature-title">Advanced Physics</h3>
              <p className="feature-desc">
                Gravity, turbulence, attractors, collisions, friction curves, and more.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3 className="feature-title">Emitter Shapes</h3>
              <p className="feature-desc">
                Point, Box, Sphere, Cone, Disk, and Edge emitters with full control.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3 className="feature-title">Curve Control</h3>
              <p className="feature-desc">
                Bezier curves for size, opacity, velocity, and rotation over particle lifetime.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h3 className="feature-title">Emitter System</h3>
              <p className="feature-desc">
                Decoupled emitters that share particle systems. No extra draw calls.
              </p>
            </div>
          </div>
        </section>

        <section className="code-section">
          <div className="code-block">
            <span className="keyword">import</span> {"{"} VFXParticles, Appearance {"}"} <span className="keyword">from</span> <span className="string">"@vfx/particles"</span>;<br />
            <br />
            <span className="keyword">function</span> FireEffect() {"{"}<br />
            &nbsp;&nbsp;<span className="keyword">return</span> (<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="prop">VFXParticles</span><br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">maxParticles</span>={"{3000}"}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">colorStart</span>={"{[\"#ff6600\", \"#ffcc00\"]}"}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">colorEnd</span>={"{[\"#ff0000\"]}"}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">size</span>={"{[0.3, 0.8]}"}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">lifetime</span>={"{[0.4, 0.8]}"}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">gravity</span>={"{[0, 0.5, 0]}"}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">appearance</span>={"{Appearance.GRADIENT}"}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">intensity</span>={"{10}"}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;/&gt;<br />
            &nbsp;&nbsp;);<br />
            {"}"}
          </div>
        </section>

        <footer className="footer">
          <div className="footer-links">
            <a href="https://github.com" className="footer-link">GitHub</a>
            <a href="https://npmjs.com" className="footer-link">NPM</a>
            <a href="#" className="footer-link">Documentation</a>
          </div>
          <p className="footer-copy">MIT License • Built with Three.js WebGPU</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
