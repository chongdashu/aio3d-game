import {
  Prefab,
  prefabRegistry,
  ComponentTypes as CoreTypes, // Alias core types for clarity
} from "aio3d-core"; // Use absolute path or adjust relative path
import * as THREE from "three";

// Import game-specific component types
import { GameComponentTypes } from "../../components/GameComponentTypes";

// Define the vibrant colors here so they can be reused for MeshComponent
const colors = [0x00bcd4, 0xff4081, 0x7c4dff, 0xffeb3b, 0x76ff03, 0xff5722];

/**
 * Prefab definition for a standard spinning cube entity.
 * This object defines the components and initial data for creating a 'SpinningCube'.
 */
const spinningCubePrefab: Prefab = {
  /**
   * Unique identifier for this prefab. Used by PrefabService.createEntityFromPrefab().
   */
  name: "SpinningCube",
  /**
   * Array of component configurations for this prefab.
   * The order might matter depending on component dependencies, though ideally systems handle dependencies.
   */
  components: [
    // --- Core Components ---
    // It's common for entities needing a 3D presence to have a TransformComponent.
    {
      type: CoreTypes.TRANSFORM, // Use the Symbol from core ComponentTypes
      data: {
        // Initial data for the TransformComponent
        position: new THREE.Vector3(0, 0.5, 0), // Start slightly above the origin
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      },
      // Note: A factory for TransformComponent likely needs to be registered in core
      // or provided by the game if custom initialization is needed.
    },
    // Add a core MeshComponent to handle the visual representation
    {
      type: CoreTypes.MESH, // Use the Symbol from core ComponentTypes
      data: {
        // Data for the MeshComponent factory
        // We'll define geometry and material creation data here.
        // The factory will need to interpret this.
        geometryType: "BoxGeometry",
        geometryArgs: [1, 1, 1], // size = 1
        materials: colors.map((color) => ({
          type: "MeshStandardMaterial",
          args: [{ color: color, roughness: 0.5, metalness: 0.2 }],
        })),
        castShadow: true,
        receiveShadow: true,
      },
    },
    // --- Game-Specific Components ---
    {
      type: GameComponentTypes.SPINNING_CUBE,
      // Data here is passed to the factory function registered in factories.ts
      data: {
        // We can optionally define a specific rotation speed here.
        // If omitted, the factory/constructor default (random) will be used.
        // rotationSpeed: new THREE.Vector3(0, 0.02, 0)
      },
    },
    /* Example: Add physics
        {
             type: CoreTypes.PHYSICS, // Requires PHYSICS symbol & factory
             data: {
                 isStatic: false,
                 shape: 'box', // Info for physics body creation
                 mass: 1
             }
        }
        */
  ],
};

// --- Register the Prefab ---
// This line ensures that the `spinningCubePrefab` object is stored in the central
// `prefabRegistry` managed by the core engine. This makes it available
// to the `PrefabService`. This registration happens automatically when this
// file is imported anywhere in the application's execution path, usually done
// once during the main initialization sequence (e.g., import './prefabs/SpinningCubePrefab'; in main.ts).
prefabRegistry.registerPrefab(spinningCubePrefab);

// Optional: Export the definition itself if it needs to be accessed directly elsewhere,
// though standard interaction should be via the PrefabService using the name 'SpinningCube'.
// export default spinningCubePrefab;
