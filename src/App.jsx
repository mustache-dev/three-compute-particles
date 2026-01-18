import * as THREE from "three/webgpu";
import { Canvas, extend } from "@react-three/fiber";
import { Suspense } from "react";
import {Loader } from "@react-three/drei";
import { WebGPUPostProcessing } from "./WebGPUPostprocessing";
import { Floor } from "./Floor";
import { Particles } from "./Particles";
import { Spark } from "./Spark";

export default function App() {
  return (
    <>
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          gl={async (props) => {
            extend(THREE);
            const renderer = new THREE.WebGPURenderer(props);

            await renderer.init();
            return renderer;
          }}
        >
          <Suspense fallback={null}>
            <WebGPUPostProcessing />
            <Floor/>
            <Spark/>
            <Particles/>
            {/* <WobblySphere/> */}
          </Suspense>
        </Canvas>
      </KeyboardControls>

      <Loader />
    </>
  );
}
