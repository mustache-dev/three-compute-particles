import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@vfx/particles": path.resolve(__dirname, "../lib/src"),
      "three/tsl": path.resolve(__dirname, "node_modules/three/build/three.tsl.js"),
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "zustand": path.resolve(__dirname, "node_modules/zustand"),
      "@react-three/fiber": path.resolve(__dirname, "node_modules/@react-three/fiber"),
    },
    dedupe: ["react", "react-dom", "zustand", "@react-three/fiber", "three"],
  },
  optimizeDeps: {
    include: ["three", "three/webgpu", "three/tsl", "react", "react-dom", "zustand"],
    exclude: ["@vfx/particles"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
  },
  base: "./",
});
