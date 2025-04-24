import {
  System,
  World,
  ComponentTypes as CoreTypes,
  TransformComponent,
} from "aio3d-core"; // Use absolute path or adjust

// Import game-specific types and components
import { GameComponentTypes } from "../../components/GameComponentTypes";
import { SpinningCubeComponent } from "../../components/SpinningCubeComponent";

/**
 * System responsible for updating the rotation of entities
 * that have both a SpinningCubeComponent (which holds rotation speed data)
 * and a TransformComponent (which holds the actual rotation state).
 */
export class SpinningSystem extends System {
  /**
   * Called once per frame by the World's update loop.
   * Finds all entities with SpinningCubeComponent and TransformComponent,
   * then updates the TransformComponent's rotation based on the
   * SpinningCubeComponent's rotationSpeed and the frame's delta time.
   *
   * @param world - The game world instance, used to query entities.
   * @param deltaTime - The time elapsed (in seconds) since the last frame.
   */
  public update(world: World, deltaTime: number): void {
    // Query for entities possessing *both* necessary components
    const entities = world.queryComponents([
      GameComponentTypes.SPINNING_CUBE, // Our custom component with speed data
      CoreTypes.TRANSFORM, // The core component holding rotation state
    ]);

    // Iterate through the found entities
    for (const entity of entities) {
      // Retrieve the components from the current entity
      // Type assertions are generally safe here because queryComponents guarantees their presence
      const spinningCube = entity.getComponent(
        GameComponentTypes.SPINNING_CUBE
      ) as SpinningCubeComponent;
      const transform = entity.getComponent(
        CoreTypes.TRANSFORM
      ) as TransformComponent;

      // Double-check components and data exist (optional, but safer)
      if (spinningCube?.rotationSpeed && transform?.rotation) {
        // --- Apply Rotation Logic ---
        // Update the Euler rotation angles stored in the TransformComponent.
        // Note: If TransformComponent used Quaternions, the update logic would differ.
        transform.rotation.x += spinningCube.rotationSpeed.x * deltaTime;
        transform.rotation.y += spinningCube.rotationSpeed.y * deltaTime;
        transform.rotation.z += spinningCube.rotationSpeed.z * deltaTime;

        // Optional: Keep angles within a standard range (0 to 2*PI) to prevent large numbers.
        // This usually isn't strictly necessary for rendering but can help debugging.
        // transform.rotation.x = (transform.rotation.x + 2 * Math.PI) % (2 * Math.PI);
        // transform.rotation.y = (transform.rotation.y + 2 * Math.PI) % (2 * Math.PI);
        // transform.rotation.z = (transform.rotation.z + 2 * Math.PI) % (2 * Math.PI);

        // Important: We modify the TransformComponent's data. Other systems (like RenderSystem)
        // will read this updated rotation to position the mesh correctly.
      }
    }
  }

  // No specific initialization needed for this system
  // public initialize(world: World): void {}

  // No specific cleanup needed for this system
  // public cleanup(): void {}
}
