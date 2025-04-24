import * as THREE from 'three';
import { ComponentTypes, prefabRegistry, Prefab } from 'aio3d-core';

/**
 * Creates a prefab for the AI Bot character with animations
 * @param options Configuration options for the AI Bot
 * @returns The AI Bot prefab definition
 */
export function createAiBotPrefab(options: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  initialAnimation?: string;
} = {}): Prefab {
  // Set default values
  const position = options.position || new THREE.Vector3(0, 0, 0);
  const rotation = options.rotation || new THREE.Euler(0, 0, 0);
  const scale = options.scale || new THREE.Vector3(1, 1, 1);
  const initialAnimation = options.initialAnimation || 'idle';

  // Create the prefab definition
  const prefab: Prefab = {
    name: `AiBot_${Date.now()}`,
    components: [
      {
        type: ComponentTypes.TRANSFORM,
        data: {
          position,
          rotation,
          scale,
        },
      },
      {
        type: ComponentTypes.MODEL,
        data: {
          // We'll load the idle model first
          modelUrl: `/assets/models/aiobot/aibot_idle.glb`,
        },
      },
      {
        type: ComponentTypes.ANIMATION_CONTROLLER,
        data: {
          // Enable model swapping since each animation is in a separate GLB file
          useModelSwapping: true,
          
          // Map animation states to model URLs
          modelUrlMap: {
            idle: '/assets/models/aiobot/aibot_idle.glb',
            walk: '/assets/models/aiobot/aibot_walk.glb',
            run: '/assets/models/aiobot/aibot_run.glb',
          },
          
          // Map animation states to animation clip names within each model
          states: {
            // Match any animation in the model file - simpler approach
            idle: '*',
            walk: '*',
            run: '*',
          },
          
          // Animation settings
          defaultFadeTime: 0.3,
          autoPlayState: initialAnimation,
          loopByDefault: true,
        },
      },
    ],
  };

  return prefab;
}

/**
 * Register the default AiBot prefab
 */
export function registerAiBotPrefab(): void {
  const prefab = createAiBotPrefab();
  prefabRegistry.registerPrefab(prefab);
}

// Auto-register the prefab when this module is imported
registerAiBotPrefab();
