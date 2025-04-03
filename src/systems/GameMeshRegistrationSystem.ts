import {
  MeshRegistrationSystem as CoreMeshRegistrationSystem,
  World,
  Entity,
  ComponentTypes,
  MeshComponent,
} from "aio3d-core";

// Import game-specific types and components
import { GameComponentTypes } from "../components/GameComponentTypes";

/**
 * Game-specific implementation of mesh registration that extends
 * core functionality to handle game-specific components.
 */
export class GameMeshRegistrationSystem extends CoreMeshRegistrationSystem {
  /**
   * Handles entity creation events, extending core functionality
   * @param entity - The created entity
   */
  protected override handleEntityCreated(entity: Entity): void {
    // Handle game-specific components first
    if (entity.hasComponent(GameComponentTypes.SPINNING_CUBE)) {
      this.handleGameSpecificMesh(entity);
      return;
    }

    // Fall back to core mesh handling
    super.handleEntityCreated(entity);
  }

  /**
   * Handles game-specific mesh registration
   * @param entity - The entity to handle
   */
  private handleGameSpecificMesh(entity: Entity): void {
    const meshComponent = entity.getComponent<MeshComponent>(
      ComponentTypes.MESH
    );
    if (!meshComponent?.mesh) {
      this.logger.warn(
        `Entity ${entity.id} has game-specific component but no mesh object`
      );
      return;
    }

    this.logger.debug(
      `Adding game-specific mesh for entity ${entity.id} to scene`
    );
    this.sceneSystem?.addToScene(meshComponent.mesh);
  }

  /**
   * Updates the system
   * @param world - The game world
   * @param deltaTime - Time elapsed since last frame
   */
  public override update(world: World, deltaTime: number): void {
    // Call core update first
    super.update(world, deltaTime);
  }
}
