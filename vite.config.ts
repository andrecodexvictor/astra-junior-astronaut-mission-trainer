import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/node_modules/@babylonjs/loaders/')) {
            return 'babylon-loaders';
          }
          if (normalized.includes('/node_modules/@babylonjs/core/ShadersWGSL/')) {
            return 'babylon-shaders-wgsl';
          }
          if (
            normalized.includes('/node_modules/@babylonjs/core/Shaders/') ||
            normalized.includes('/node_modules/@babylonjs/core/Engines/shaderStore')
          ) {
            return 'babylon-shaders';
          }
          if (normalized.includes('/node_modules/@babylonjs/core/Materials/PBR/')) {
            return 'babylon-pbr';
          }
          if (
            normalized.includes('/node_modules/@babylonjs/core/Engines/WebGPU/') ||
            /\/node_modules\/@babylonjs\/core\/Engines\/.*webgpu/i.test(normalized)
          ) {
            return 'babylon-webgpu';
          }
          if (
            normalized.includes('/node_modules/@babylonjs/core/Cameras/arcRotateCamera') ||
            normalized.includes('/node_modules/@babylonjs/core/Cameras/freeCamera') ||
            normalized.includes('/node_modules/@babylonjs/core/Meshes/Builders/') ||
            normalized.includes('/node_modules/@babylonjs/core/Lights/Shadows/') ||
            normalized.includes('/node_modules/@babylonjs/core/Lights/hemisphericLight') ||
            normalized.includes('/node_modules/@babylonjs/core/Lights/directionalLight') ||
            normalized.includes('/node_modules/@babylonjs/core/Animations/animationGroup') ||
            normalized.includes('/node_modules/@babylonjs/core/Behaviors/') ||
            normalized.includes('/node_modules/@babylonjs/core/Materials/Textures/dynamicTexture') ||
            normalized.includes('/node_modules/@babylonjs/core/Particles/') ||
            normalized.includes('/node_modules/@babylonjs/core/Morph/') ||
            normalized.includes('/node_modules/@babylonjs/core/Instrumentation/') ||
            normalized.includes('/node_modules/@babylonjs/core/assetContainer')
          ) {
            return 'babylon-scene-features';
          }
          if (normalized.includes('/node_modules/@babylonjs/core/')) {
            return 'babylon-core';
          }
          return undefined;
        },
      },
    },
  },
  server: { host: '0.0.0.0' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
