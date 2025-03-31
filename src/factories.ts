import {
  ComponentFactoryRegistry,
  ComponentTypes as CoreTypes, // Import CoreTypes
  TransformComponent, // Import TransformComponent itself
  MeshComponent, // Import MeshComponent
} from "aio3d-core"; // Use absolute path if configured, or adjust relative path
import * as THREE from "three";

// Import game-specific types and components
import { GameComponentTypes } from "./components/GameComponentTypes";
import { SpinningCubeComponent } from "./components/SpinningCubeComponent";
// Import other game components as needed
// import { PlayerStatsComponent } from './components/PlayerStatsComponent';

/**
 * Registers factory functions for all game-specific components
 * that are intended to be used within prefabs.
 *
 * This function should be called once during application initialization,
 * passing the core ComponentFactoryRegistry instance.
 *
 * @param factoryRegistry - The core ComponentFactoryRegistry instance to register with.
 */
export function registerGameFactories(
  factoryRegistry: ComponentFactoryRegistry
): void {
  // --- Factory for Core TransformComponent ---
  factoryRegistry.registerFactory(
    CoreTypes.TRANSFORM,
    (data?: {
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      scale?: THREE.Vector3;
    }) => {
      const component = new TransformComponent();
      if (data?.position) component.position.copy(data.position);
      if (data?.rotation) component.rotation.copy(data.rotation);
      if (data?.scale) component.scale.copy(data.scale);
      return component;
    }
  );

  // --- Factory for Core MeshComponent ---
  factoryRegistry.registerFactory(
    CoreTypes.MESH,
    (data?: {
      geometryType?: string;
      geometryArgs?: any[];
      materials?: { type: string; args: any[] }[];
      castShadow?: boolean;
      receiveShadow?: boolean;
    }) => {
      let geometry: THREE.BufferGeometry | undefined;
      let material: THREE.Material | THREE.Material[] | undefined;

      // Basic Geometry Creation (Extend with more types as needed)
      if (
        data?.geometryType === "BoxGeometry" &&
        Array.isArray(data.geometryArgs)
      ) {
        geometry = new THREE.BoxGeometry(...data.geometryArgs);
      } else {
        console.warn(
          "MeshComponent Factory: Unsupported or missing geometry data. Defaulting to BoxGeometry."
        );
        geometry = new THREE.BoxGeometry(1, 1, 1); // Default
      }

      // Basic Material Creation (Extend with more types/error handling)
      if (Array.isArray(data?.materials) && data.materials.length > 0) {
        const createdMaterials = data.materials.map((matData) => {
          if (
            matData.type === "MeshStandardMaterial" &&
            Array.isArray(matData.args)
          ) {
            return new THREE.MeshStandardMaterial(...matData.args);
          }
          // Add other material types here (MeshBasicMaterial, etc.)
          console.warn(
            `MeshComponent Factory: Unsupported material type "${matData.type}".`
          );
          return new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Default error material
        });
        // Use single material if only one, otherwise array
        material =
          createdMaterials.length === 1
            ? createdMaterials[0]
            : createdMaterials;
      } else {
        console.warn(
          "MeshComponent Factory: Missing or invalid materials data. Defaulting to MeshStandardMaterial."
        );
        material = new THREE.MeshStandardMaterial({ color: 0xcccccc }); // Default material
      }

      // Create the component
      const component = new MeshComponent(geometry, material);

      // Apply other properties if provided
      if (data?.castShadow !== undefined)
        component.mesh.castShadow = data.castShadow;
      if (data?.receiveShadow !== undefined)
        component.mesh.receiveShadow = data.receiveShadow;

      return component;
    }
  );

  // --- Factory for SpinningCubeComponent ---
  factoryRegistry.registerFactory(
    GameComponentTypes.SPINNING_CUBE,
    (data?: { rotationSpeed?: THREE.Vector3 }) => {
      // Pass rotationSpeed data to constructor if provided
      return new SpinningCubeComponent(data?.rotationSpeed);
    }
  );

  // --- Add factories for other game components here ---
  /* Example:
    factoryRegistry.registerFactory(
        GameComponentTypes.PLAYER_STATS, // Assuming this Symbol exists
        (data?: { health?: number; score?: number }) => {
            // Provide defaults if data is missing
            const health = data?.health ?? 100;
            const score = data?.score ?? 0;
            // Ensure required components like Transform are handled elsewhere if needed
            return new PlayerStatsComponent(health, score);
        }
    );
    */

  console.log("Registered core and game component factories.");
}
