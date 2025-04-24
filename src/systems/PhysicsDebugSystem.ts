import * as THREE from "three";
import {
  System,
  World,
  ComponentTypes,
  TransformComponent,
  loggingService,
} from "aio3d-core";
import { SceneSystem } from "aio3d-core";

/**
 * System for visualizing physics bodies and colliders
 * This helps debug physics issues by showing wireframe representations
 */
export class PhysicsDebugSystem extends System {
  private sceneSystem: SceneSystem | null = null;
  private world: World | null = null;
  private debugObjects: Map<number, THREE.Object3D> = new Map();
  private logger = loggingService.createClassLogger(this);
  private enabled = true;

  /**
   * Initialize the system
   * @param world The game world
   */
  public initialize(world: World): void {
    this.world = world;

    // Find scene system
    const sceneSys = world
      .getSystems()
      .find((sys): sys is SceneSystem => sys instanceof SceneSystem);

    if (!sceneSys) {
      this.logger.error("SceneSystem not found in world");
      throw new Error("PhysicsDebugSystem: SceneSystem not found in world");
    }

    this.sceneSystem = sceneSys;
    this.logger.info("PhysicsDebugSystem initialized");

    // Create debug objects for existing physics entities
    this.createDebugVisualsForExistingBodies();
  }

  /**
   * Create debug visuals for all existing physics bodies
   */
  private createDebugVisualsForExistingBodies(): void {
    if (!this.world) return;

    // Find all entities with rigid bodies
    const entities = this.world.queryComponents([
      ComponentTypes.RIGID_BODY,
      ComponentTypes.COLLIDER,
      ComponentTypes.TRANSFORM,
    ]);

    for (const entity of entities) {
      this.createDebugVisualForEntity(entity.id);
    }

    this.logger.info(
      `Created debug visuals for ${entities.length} physics bodies`
    );
  }

  /**
   * Create debug visual for a specific entity
   */
  private createDebugVisualForEntity(entityId: number): void {
    if (!this.world || !this.sceneSystem) return;

    const entity = this.world.getEntity(entityId);
    if (!entity) return;

    // Get required components
    const transform = entity.getComponent<TransformComponent>(
      ComponentTypes.TRANSFORM
    );
    const rigidBody = entity.getComponent(ComponentTypes.RIGID_BODY);
    const collider = entity.getComponent(ComponentTypes.COLLIDER);

    if (!transform || !rigidBody || !collider) return;

    // Create wireframe debug visual based on collider type
    let debugMesh: THREE.Mesh | null = null;

    if ((collider as any).shape === "box" && (collider as any).size) {
      const [width, height, depth] = (collider as any).size;
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshBasicMaterial({
        color: (collider as any).isSensor ? 0x00ff00 : 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      debugMesh = new THREE.Mesh(geometry, material);
    } else if (
      (collider as any).shape === "sphere" &&
      (collider as any).radius
    ) {
      const geometry = new THREE.SphereGeometry(
        (collider as any).radius,
        16,
        8
      );
      const material = new THREE.MeshBasicMaterial({
        color: (collider as any).isSensor ? 0x00ff00 : 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      debugMesh = new THREE.Mesh(geometry, material);
    } else {
      // Default fallback for other shapes
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      debugMesh = new THREE.Mesh(geometry, material);
    }

    if (debugMesh) {
      // Set initial position
      debugMesh.position.copy(transform.position);

      // Add to scene
      this.sceneSystem.addToScene(debugMesh);

      // Store reference
      this.debugObjects.set(entityId, debugMesh);

      this.logger.debug(`Created debug visual for entity ${entityId}`);
    }
  }

  /**
   * Update system - sync debug visuals with physics state
   */
  public update(world: World, _deltaTime: number): void {
    if (!this.enabled || !this.sceneSystem) return;

    // Find all entities with rigid bodies
    const entities = world.queryComponents([
      ComponentTypes.RIGID_BODY,
      ComponentTypes.TRANSFORM,
    ]);

    // Update existing debug visuals
    for (const entity of entities) {
      const transform = entity.getComponent<TransformComponent>(
        ComponentTypes.TRANSFORM
      );

      if (!transform) continue;

      // Get or create debug visual
      let debugObject = this.debugObjects.get(entity.id);

      if (!debugObject) {
        this.createDebugVisualForEntity(entity.id);
        debugObject = this.debugObjects.get(entity.id);
        if (!debugObject) continue;
      }

      // Update position from transform component
      debugObject.position.copy(transform.position);
      debugObject.rotation.copy(transform.rotation);

      // Log positions for debugging
      if (transform.position.y > 0.5) {
        this.logger.debug(
          `Entity ${entity.id} position: y=${transform.position.y.toFixed(2)}`
        );
      }
    }
  }

  /**
   * Set visibility of debug visualizations
   */
  public setVisible(visible: boolean): void {
    this.enabled = visible;

    // Toggle visibility of all debug objects
    for (const obj of this.debugObjects.values()) {
      obj.visible = visible;
    }

    this.logger.info(
      `Debug visualizations ${visible ? "enabled" : "disabled"}`
    );
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.sceneSystem) {
      // Remove all debug objects from scene
      for (const obj of this.debugObjects.values()) {
        this.sceneSystem.removeFromScene(obj);
      }

      this.debugObjects.clear();
      this.logger.info("Cleaned up debug visualizations");
    }

    this.sceneSystem = null;
    this.world = null;
  }
}
