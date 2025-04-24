import {
  UIRegistrationSystem as CoreUIRegistrationSystem,
  World,
  Entity,
  ComponentTypes,
  MeshComponent,
  TransformComponent,
} from "aio3d-core";
import { GameComponentTypes } from "../../components/GameComponentTypes";
import { TextComponent } from "../../components/ui/TextComponent";

/**
 * Game-specific implementation of UI registration that extends
 * core functionality to handle game-specific components like
 * MenuItems and Text components.
 */
export class GameUIRegistrationSystem extends CoreUIRegistrationSystem {
  /**
   * Handles entity creation events, extending core functionality
   * @param entity - The created entity
   */
  protected override handleEntityCreated(entity: Entity): void {
    // Handle game-specific UI components first
    if (
      entity.hasComponent(GameComponentTypes.MENU_ITEM) ||
      entity.hasComponent(GameComponentTypes.TEXT)
    ) {
      this.handleGameUIEntity(entity);
      return;
    }

    // Fall back to core UI handling
    super.handleEntityCreated(entity);
  }

  /**
   * Handles game-specific UI entity registration
   * @param entity - The entity to handle
   */
  private handleGameUIEntity(entity: Entity): void {
    const transform = entity.getComponent<TransformComponent>(
      ComponentTypes.TRANSFORM
    );
    if (!transform) {
      console.warn(
        "GameUIRegistrationSystem: Entity has no transform component"
      );
      return;
    }

    // Check for MeshComponent (background)
    const meshComponent = entity.getComponent<MeshComponent>(
      ComponentTypes.MESH
    );
    if (meshComponent) {
      const mesh = meshComponent.getMesh();
      // Set position, rotation, and scale directly
      mesh.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
      mesh.rotation.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z
      );
      mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
      this.sceneSystem?.addToScene(mesh);
    }

    // Check for TextComponent
    const textComponent = entity.getComponent<TextComponent>(
      GameComponentTypes.TEXT
    );
    if (textComponent) {
      const textMesh = textComponent.getMesh();
      // Set position, rotation, and scale directly
      textMesh.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
      textMesh.rotation.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z
      );
      textMesh.scale.set(
        transform.scale.x,
        transform.scale.y,
        transform.scale.z
      );
      // Keep the slight z-offset for text
      textMesh.position.z += 0.01;
      this.sceneSystem?.addToScene(textMesh);
    }
  }

  /**
   * Updates the system
   * @param world - The game world
   * @param deltaTime - Time elapsed since last frame
   */
  public override update(world: World, deltaTime: number): void {
    // Call core update for billboarding etc.
    super.update(world, deltaTime);
  }
}
