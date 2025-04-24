import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Define a minimal GLTF result type for our needs
interface GLTFResult {
  animations: THREE.AnimationClip[];
}

// Utility function to inspect animations in a GLB/GLTF model
export async function inspectModelAnimations(modelPath: string): Promise<void> {
  console.log(`Inspecting animations in: ${modelPath}`);
  
  const loader = new GLTFLoader();
  
  return new Promise<void>((resolve, reject) => {
    loader.load(
      modelPath,
      (gltf: GLTFResult) => {
        console.log(`Model loaded: ${modelPath}`);
        
        if (gltf.animations && gltf.animations.length > 0) {
          console.log(`Found ${gltf.animations.length} animations:`);
          gltf.animations.forEach((anim: THREE.AnimationClip, index: number) => {
            console.log(`  ${index}: '${anim.name}' (duration: ${anim.duration.toFixed(2)}s)`);
          });
        } else {
          console.log('No animations found in this model');
        }
        
        resolve();
      },
      undefined,
      (err: unknown) => {
        console.error(`Error loading model:`, err);
        reject(new Error(String(err)));
      }
    );
  });
}

// Inspect all three models
export async function inspectAllAnimations(): Promise<void> {
  const modelPaths = [
    '/assets/models/aiobot/aibot_idle.glb',
    '/assets/models/aiobot/aibot_walk.glb',
    '/assets/models/aiobot/aibot_run.glb'
  ];
  
  for (const path of modelPaths) {
    await inspectModelAnimations(path);
    console.log('---');
  }
}
