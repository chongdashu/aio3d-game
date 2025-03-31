import {
  Prefab,
  prefabRegistry,
  ComponentTypes as CoreTypes,
} from "aio3d-core";
import * as THREE from "three";

/**
 * Prefab definition for a ground plane entity.
 * Creates a flat surface that serves as the ground in the scene.
 */
const groundPlanePrefab: Prefab = {
  /**
   * Unique identifier for this prefab.
   */
  name: "GroundPlane",

  /**
   * Component configurations for the ground plane.
   */
  components: [
    // Transform component
    {
      type: CoreTypes.TRANSFORM,
      data: {
        position: new THREE.Vector3(0, 0, 0), // At origin
        rotation: new THREE.Euler(-Math.PI / 2, 0, 0), // Rotate to be horizontal (x-z plane)
        scale: new THREE.Vector3(10, 10, 1), // 10x10 size
      },
    },
    // Mesh component
    {
      type: CoreTypes.MESH,
      data: {
        geometryType: "PlaneGeometry",
        geometryArgs: [1, 1], // Base size of 1x1 (scaled by transform)
        materials: [
          {
            type: "MeshStandardMaterial",
            args: [
              {
                color: 0x444444,
                roughness: 0.8,
                metalness: 0.2,
                side: THREE.DoubleSide,
              },
            ],
          },
        ],
        receiveShadow: true, // Ground will receive shadows
      },
    },
  ],
};

// Register the prefab
prefabRegistry.registerPrefab(groundPlanePrefab);
