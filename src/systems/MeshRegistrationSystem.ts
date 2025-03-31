import {
  System,
  World,
  Entity,
  SceneSystem,
  ComponentTypes as CoreTypes,
  MeshComponent, // Make sure MeshComponent is exported from core/index.ts
} from "aio3d-core"; // Use absolute path or adjust

// Import game-specific types and components
import { GameComponentTypes } from "../components/GameComponentTypes";
import { SpinningCubeComponent } from "../components/SpinningCubeComponent";

/**
 * A System that listens for the 'entityCreatedFromPrefab' event.
 * When triggered, it checks the new entity for components that have visual meshes
 * (like the game-specific SpinningCubeComponent or the core MeshComponent)
 * and adds those meshes to the main SceneSystem for rendering.
 *
 * This handles the "post-processing" step for visual components created via prefabs.
 */
export class MeshRegistrationSystem extends System {
  // Cache the SceneSystem for efficiency
  private sceneSystem: SceneSystem | null = null;
  // Store the world instance for cleanup
  private worldInstance: World | null = null;
  // Store the bound handler function for easy removal on cleanup
  private boundEventHandler: (entity: Entity, prefabName: string) => void;

  constructor() {
    super();
    // Pre-bind the event handler method to `this` instance
    this.boundEventHandler = this.handleEntityCreated.bind(this);
  }

  /**
   * Initializes the system. Called once when the system is added to the World.
   * It finds the SceneSystem and registers the event listener.
   * @param world - The game world instance.
   */
  public initialize(world: World): void {
    // Store the world instance for later use (e.g., in cleanup)
    this.worldInstance = world;

    // Attempt to find the SceneSystem instance within the world's systems.
    // This relies on SceneSystem being added to the world *before* this system.
    this.sceneSystem =
      world
        .getSystems()
        .find((sys): sys is SceneSystem => sys instanceof SceneSystem) ?? null;

    if (!this.sceneSystem) {
      console.error(
        "MeshRegistrationSystem Error: SceneSystem not found in the world. Mesh registration will fail. Ensure SceneSystem is added before MeshRegistrationSystem."
      );
      // Depending on game requirements, you might want to throw an Error here
      // to halt initialization if the SceneSystem is critical.
      // throw new Error("MeshRegistrationSystem requires an active SceneSystem.");
      return; // Stop initialization if SceneSystem is missing
    }

    // Check if the world has an event bus and register the listener
    if (world.eventBus) {
      world.eventBus.on("entityCreatedFromPrefab", this.boundEventHandler);
      // console.log("MeshRegistrationSystem: Initialized and listening for 'entityCreatedFromPrefab' events.");
    } else {
      console.warn(
        "MeshRegistrationSystem Warning: World instance lacks an eventBus. Cannot listen for prefab creation events."
      );
    }
  }

  /**
   * Event handler triggered by the 'entityCreatedFromPrefab' event from PrefabService.
   * It inspects the newly created entity for known components containing meshes
   * and adds them to the SceneSystem.
   * @param entity - The entity that was just created.
   * @param prefabName - The name of the prefab used (useful for debugging).
   */
  private handleEntityCreated(entity: Entity, prefabName: string): void {
    // If SceneSystem wasn't found during init, do nothing.
    if (!this.sceneSystem) {
      // Error was already logged during initialize
      return;
    }

    // --- 1. Check for Game-Specific Components (e.g., SpinningCubeComponent) ---
    if (entity.hasComponent(GameComponentTypes.SPINNING_CUBE)) {
      const spinningCubeComp = entity.getComponent(
        GameComponentTypes.SPINNING_CUBE
      ) as SpinningCubeComponent;
      // Safely check if the component and its mesh property exist
      if (spinningCubeComp?.mesh) {
        this.sceneSystem.addToScene(spinningCubeComp.mesh);
        // Optional logging:
        // console.log(`MeshRegistrationSystem: Added mesh from SpinningCubeComponent for entity ${entity.id} (prefab: ${prefabName}).`);
      } else {
        // This might indicate an issue with SpinningCubeComponent's constructor or prefab data
        console.warn(
          `MeshRegistrationSystem Warning: Entity ${entity.id} (prefab: ${prefabName}) has SpinningCubeComponent but no valid 'mesh' property found.`
        );
      }
    }

    // --- 2. Check for Core MeshComponent ---
    // Handles prefabs that might directly define a mesh using the standard core component.
    if (entity.hasComponent(CoreTypes.MESH)) {
      const meshComp = entity.getComponent(CoreTypes.MESH) as MeshComponent;
      // Safely check if the component and its mesh property exist
      if (meshComp?.mesh) {
        this.sceneSystem.addToScene(meshComp.mesh);
        // Optional logging:
        // console.log(`MeshRegistrationSystem: Added mesh from core MeshComponent for entity ${entity.id} (prefab: ${prefabName}).`);
      } else {
        // This might indicate an issue with the factory creating MeshComponent or the prefab data
        console.warn(
          `MeshRegistrationSystem Warning: Entity ${entity.id} (prefab: ${prefabName}) has core MeshComponent but no valid 'mesh' property found.`
        );
      }
    }

    // --- 3. Add Checks for Other Components ---
    // If other components (e.g., SkinnedMeshComponent, SpriteComponent) exist
    // and need their visual elements added to the scene, add similar checks here.
  }

  /**
   * This system is event-driven, so its update loop typically does nothing.
   * @param _deltaTime - Time since last frame (unused).
   * @param _world - Reference to the world (unused).
   */
  public update(world: World, deltaTime: number): void {
    // If we needed world/deltaTime access here, we'd use the parameters.
    // Since this system is purely event-driven, we mark them as unused (or omit prefix if needed).
    const _world = world; // Assign to unused variable to satisfy linter if needed
    const _deltaTime = deltaTime;
    // No action needed in the update loop for this system.
  }

  /**
   * Cleans up resources when the system is removed or the world resets.
   * Primarily, it removes the event listener to prevent memory leaks.
   */
  public cleanup(): void {
    // Use the stored world instance to access the event bus and remove the listener
    if (this.worldInstance?.eventBus) {
      this.worldInstance.eventBus.off(
        "entityCreatedFromPrefab",
        this.boundEventHandler
      );
      // console.log("MeshRegistrationSystem cleaned up event listener.");
    } else {
      // Log a warning if cleanup is attempted without a valid world/eventbus reference
      console.warn(
        "MeshRegistrationSystem cleanup: Could not remove event listener (worldInstance or eventBus missing)."
      );
    }

    // Reset internal state
    this.sceneSystem = null;
    this.worldInstance = null; // Clear the stored world reference
  }
}
