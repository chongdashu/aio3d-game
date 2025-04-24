import {
  Entity,
  ComponentTypes,
  prefabRegistry,
  MeshComponent,
  TransformComponent,
} from "aio3d-core";
import { BaseLevel } from "@/levels/BaseLevel";
import { createOrbitCameraPrefab } from "aio3d-core";
import * as THREE from "three";
import "@/prefabs/simple/GroundPlanePrefab";
import { PhysicsDebugSystem } from "@/systems/PhysicsDebugSystem";

/**
 * Simple physics level that demonstrates rigid‑body collisions.
 */
export class PhysicsCollisionLevel extends BaseLevel {
  protected setupLevel(): void {
    // Setup camera
    const cameraPrefab = createOrbitCameraPrefab({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      target: new THREE.Vector3(0, 0, 0),
      distance: 15,
      fov: 60,
      orbitSettings: {
        enableZoom: true,
        enablePan: true,
      },
    });
    prefabRegistry.registerPrefab(cameraPrefab);
    this.prefabService.createEntityFromPrefab(cameraPrefab.name);

    // Setup basic lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.7);
    this.sceneSystem.addToScene(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 15, 7.5);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    this.sceneSystem.addToScene(dir);

    // Create a proper ground plane that works correctly with physics
    this.createPhysicsGround();

    // Add some debug info about starting physics
    this.logger.info("Physics simulation starting - creating a falling box");

    // Add physics debug visualization
    const physicsDebugSystem = new PhysicsDebugSystem();
    this.world.addSystem(physicsDebugSystem);
    physicsDebugSystem.initialize(this.world);

    // Create falling box with properly instantiated MeshComponent
    const box = new Entity();
    // Create proper Transform with THREE.js objects
    const transformComponent = new TransformComponent();
    transformComponent.position.set(0, 10, 0); // Position is properly above ground
    transformComponent.rotation.set(0, 0, 0);
    transformComponent.scale.set(1, 1, 1);
    box.addComponent(ComponentTypes.TRANSFORM, transformComponent);

    // Create the MeshComponent properly
    const boxGeom = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xff6347,
      roughness: 0.5,
      metalness: 0.2,
    });
    const boxMeshComp = new MeshComponent(boxGeom, boxMat);
    boxMeshComp.mesh.castShadow = true;
    boxMeshComp.mesh.receiveShadow = true;
    box.addComponent(ComponentTypes.MESH, boxMeshComp);

    box.addComponent(ComponentTypes.RIGID_BODY, {
      bodyType: "dynamic",
      mass: 2,
      gravityScale: 1.0,
    });
    box.addComponent(ComponentTypes.COLLIDER, {
      shape: "box",
      size: [1, 1, 1],
    });
    this.world.addEntity(box);

    // Add the mesh to the scene
    const retrievedMeshComp = box.getComponent<MeshComponent>(
      ComponentTypes.MESH
    );
    if (retrievedMeshComp) {
      this.sceneSystem.addToScene(retrievedMeshComp.getMesh());
    } else {
      this.logger.warn(
        "Box entity created without a mesh – nothing will be rendered for it"
      );
    }

    // Add more boxes at different positions to see physics interactions
    this.createPhysicsBox(2, 8, 2, 0xff0000);
    this.createPhysicsBox(-2, 12, -2, 0x00ff00);
    this.createPhysicsBox(1, 14, -1, 0x0000ff);

    // Force stronger gravity to ensure objects fall
    this.enforcePhysicsMovement();

    // Log collision events
    this.world.eventBus.on("physics_collision_start", (evt: any) => {
      const now = new Date();
      this.logger.info(
        `[${now.toISOString()}] Collision started: Object ${evt.bodyA} hit ${
          evt.bodyB
        }`
      );
      console.log("Collision details:", evt);
    });
    this.world.eventBus.on("physics_collision_end", (evt: any) => {
      this.logger.info(
        `Collision ended between objects ${evt.bodyA} and ${evt.bodyB}`
      );
    });

    // Start a debug loop to check physics status
    this.startPhysicsDebugLogger();
  }

  protected cleanupLevelSpecifics(): void {
    // Run any stored cleanup callbacks
    this.cleanupCallbacks.forEach((callback) => callback());
    this.cleanupCallbacks = [];
  }

  protected recreateSceneAfterContextRestore(): void {
    // Re‑setup level elements when WebGL context is restored
    this.setupLevel();
  }

  /**
   * Helper to create multiple physics boxes
   */
  private createPhysicsBox(
    x: number,
    y: number,
    z: number,
    color: number
  ): void {
    const box = new Entity();

    // Create proper Transform with random rotation
    const transformComponent = new TransformComponent();
    transformComponent.position.set(x, y, z);

    // Add random rotation for more interesting physics
    transformComponent.rotation.set(
      Math.random() * Math.PI * 2, // Random X rotation
      Math.random() * Math.PI * 2, // Random Y rotation
      Math.random() * Math.PI * 2 // Random Z rotation
    );

    transformComponent.scale.set(1, 1, 1);
    box.addComponent(ComponentTypes.TRANSFORM, transformComponent);

    // Create mesh
    const boxGeom = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.2,
    });
    const boxMeshComp = new MeshComponent(boxGeom, boxMat);
    boxMeshComp.mesh.castShadow = true;
    boxMeshComp.mesh.receiveShadow = true;
    box.addComponent(ComponentTypes.MESH, boxMeshComp);

    // Add physics with better settings for realistic movement
    box.addComponent(ComponentTypes.RIGID_BODY, {
      bodyType: "dynamic",
      mass: 1 + Math.random() * 2, // Random mass for more varied behavior
      gravityScale: 1.5, // Slightly higher gravity
      linearDamping: 0.01, // Reduce damping to avoid slowdown
      angularDamping: 0.05, // Allow more rotation
    });

    box.addComponent(ComponentTypes.COLLIDER, {
      shape: "box",
      size: [1, 1, 1],
      restitution: 0.3, // Add some bounciness
      friction: 0.8, // Add more friction for better contact
    });

    this.world.addEntity(box);

    // Add to scene
    const meshComp = box.getComponent<MeshComponent>(ComponentTypes.MESH);
    if (meshComp) {
      this.sceneSystem.addToScene(meshComp.getMesh());
    }
  }

  /**
   * Creates a ground plane with physics that respects the Three.js coordinate system
   * where Y is up, and the ground lies on the X-Z plane
   */
  private createPhysicsGround(): void {
    const ground = new Entity();

    // Create transform with the right position
    const transformComponent = new TransformComponent();
    transformComponent.position.set(0, 0, 0);
    // No rotation on the transform - everything aligned by default
    transformComponent.rotation.set(0, 0, 0);
    transformComponent.scale.set(1, 1, 1);
    ground.addComponent(ComponentTypes.TRANSFORM, transformComponent);

    // Use a box geometry that's flat instead of a plane
    // This avoids rotation issues between visual and physics
    const groundGeom = new THREE.BoxGeometry(20, 0.1, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8,
      metalness: 0.2,
    });
    const groundMeshComp = new MeshComponent(groundGeom, groundMat);
    groundMeshComp.mesh.receiveShadow = true;

    ground.addComponent(ComponentTypes.MESH, groundMeshComp);

    // Add static rigid body physics
    ground.addComponent(ComponentTypes.RIGID_BODY, {
      bodyType: "static",
    });

    // Collider matching our visual mesh
    ground.addComponent(ComponentTypes.COLLIDER, {
      shape: "box",
      size: [20, 0.1, 20], // Wide on X,Z, thin on Y
    });

    this.world.addEntity(ground);

    // Add mesh to scene
    const meshComp = ground.getComponent<MeshComponent>(ComponentTypes.MESH);
    if (meshComp) {
      this.sceneSystem.addToScene(meshComp.getMesh());
    }

    // Verify physics is enabled
    this.logger.info("Ground plane created with physics collider");
  }

  /**
   * Start a debug interval to log physics state
   */
  private startPhysicsDebugLogger(): void {
    // Log physics state every second
    const debugInterval = setInterval(() => {
      // Find our box entities
      const boxes = this.world.queryComponents([
        ComponentTypes.RIGID_BODY,
        ComponentTypes.TRANSFORM,
      ]);

      if (boxes.length > 0) {
        const box = boxes[0]; // Just check the first box
        const transform = box.getComponent<TransformComponent>(
          ComponentTypes.TRANSFORM
        );

        if (transform) {
          this.logger.debug(
            `Box position: y=${transform.position.y.toFixed(2)}`
          );
        }
      } else {
        this.logger.warn("No physics bodies found in the scene");
      }
    }, 1000);

    // Clean up the interval when level is cleaned up
    this.cleanupCallbacks = this.cleanupCallbacks || [];
    this.cleanupCallbacks.push(() => clearInterval(debugInterval));
  }

  /**
   * Enforce physics movement by adding forces and testing gravity
   */
  private enforcePhysicsMovement(): void {
    // Increase gravity scale on all rigid bodies
    const physicsEntities = this.world.queryComponents([
      ComponentTypes.RIGID_BODY,
    ]);

    this.logger.info(
      `Found ${physicsEntities.length} physics entities to apply gravity to`
    );

    for (const entity of physicsEntities) {
      const rigidBody = entity.getComponent(ComponentTypes.RIGID_BODY);
      if (rigidBody) {
        // Adjust gravity and physics properties for more realistic motion
        (rigidBody as any).gravityScale = 1.5; // More reasonable than 10.0
        (rigidBody as any).linearDamping = 0.01; // Low damping for better movement
        (rigidBody as any).angularDamping = 0.05; // Allow rotations

        // Add some debug properties to verify physics is working
        (rigidBody as any).debugPhysics = true;

        this.logger.info(`Adjusted physics properties for entity ${entity.id}`);
      }
    }

    // Apply initial impulse to kickstart movement
    this.applyInitialImpulse();

    // Also set up periodic impulses to ensure continued movement
    const impulseInterval = setInterval(() => {
      this.applyPeriodicImpulse();
    }, 3000); // Apply every 3 seconds

    this.cleanupCallbacks.push(() => clearInterval(impulseInterval));
  }

  /**
   * Apply initial impulse to dynamic bodies
   */
  private applyInitialImpulse(): void {
    setTimeout(() => {
      // Get a reference to the PhysicsSystem to check for registered bodies
      const physicsSystem = this.world
        .getSystems()
        .find((system) => system.constructor.name === "PhysicsSystem");

      if (!physicsSystem) {
        this.logger.warn(
          "Cannot apply initial impulses: PhysicsSystem not found"
        );
        return;
      }

      const boxes = this.world.queryComponents([
        ComponentTypes.TRANSFORM,
        ComponentTypes.RIGID_BODY,
      ]);

      this.logger.info(
        `Found ${boxes.length} rigid body entities to apply impulses`
      );

      // Apply to all boxes except the ground plane
      const dynamicBoxes = boxes.filter((entity) => {
        const transform = entity.getComponent<TransformComponent>(
          ComponentTypes.TRANSFORM
        );
        const rb = entity.getComponent(ComponentTypes.RIGID_BODY);
        // Check if it's not the ground (approximate check based on y position)
        return (
          transform &&
          transform.position.y > 0.5 &&
          rb &&
          (rb as any).bodyType === "dynamic"
        );
      });

      this.logger.info(
        `Filtered to ${dynamicBoxes.length} dynamic boxes above ground`
      );

      if (dynamicBoxes.length > 0) {
        dynamicBoxes.forEach((box) => {
          // Apply initial impulse with some randomness for more natural motion
          const impulse = {
            x: (Math.random() - 0.5) * 1.0, // Small random X force
            y: -5 - Math.random() * 2, // Downward force with randomness
            z: (Math.random() - 0.5) * 1.0, // Small random Z force
          };

          this.world.eventBus.emit("physics_apply_impulse", {
            entityId: box.id,
            impulse,
          });

          // Add some initial angular velocity too
          this.world.eventBus.emit("physics_apply_torque_impulse", {
            entityId: box.id,
            torque: {
              x: (Math.random() - 0.5) * 1.0,
              y: (Math.random() - 0.5) * 1.0,
              z: (Math.random() - 0.5) * 1.0,
            },
          });

          // Log position for debugging
          const transform = box.getComponent<TransformComponent>(
            ComponentTypes.TRANSFORM
          );
          if (transform) {
            this.logger.debug(
              `Box ${box.id} initial position: (${transform.position.x}, ${transform.position.y}, ${transform.position.z})`
            );
          }
        });

        this.logger.info(`Applied impulses to ${dynamicBoxes.length} boxes`);
      } else {
        this.logger.warn("No dynamic boxes found to apply impulse");
      }
    }, 1000);
  }

  /**
   * Apply periodic impulses to keep things moving
   */
  private applyPeriodicImpulse(): void {
    // Get a reference to the PhysicsSystem to check for registered bodies
    const physicsSystem = this.world
      .getSystems()
      .find((system) => system.constructor.name === "PhysicsSystem");

    if (!physicsSystem) {
      this.logger.warn(
        "Cannot apply periodic impulses: PhysicsSystem not found"
      );
      return;
    }

    // Filter for entities with both Transform and RigidBody components
    const dynamicBoxes = this.world
      .queryComponents([ComponentTypes.TRANSFORM, ComponentTypes.RIGID_BODY])
      .filter((entity) => {
        const transform = entity.getComponent<TransformComponent>(
          ComponentTypes.TRANSFORM
        );
        const rb = entity.getComponent(ComponentTypes.RIGID_BODY);

        // Check if it's a dynamic body above ground level
        const isDynamicAndAboveGround =
          transform &&
          transform.position.y > 0.5 &&
          rb &&
          (rb as any).bodyType === "dynamic";

        // Verify that the entity is actually registered in the PhysicsSystem
        // This avoids the "Cannot apply impulse: Entity X does not have a rigid body" warnings
        if (isDynamicAndAboveGround) {
          // Use the eventBus to check if this entity has a rigid body in the physics system
          let hasRegisteredBody = false;
          this.world.eventBus.emit("physics_check_entity", {
            entityId: entity.id,
            callback: (exists: boolean) => {
              hasRegisteredBody = exists;
            },
          });

          if (!hasRegisteredBody) {
            this.logger.debug(
              `Skipping entity ${entity.id} - it has RigidBody component but is not registered with PhysicsSystem`
            );
          }

          return isDynamicAndAboveGround && hasRegisteredBody;
        }

        return false;
      });

    // Add random impulses to create more interesting motion
    dynamicBoxes.forEach((box) => {
      // Random impulse in X and Z directions
      const impulse = {
        x: (Math.random() - 0.5) * 5,
        y: -5, // Always push down
        z: (Math.random() - 0.5) * 5,
      };

      this.world.eventBus.emit("physics_apply_impulse", {
        entityId: box.id,
        impulse,
      });

      const transform = box.getComponent<TransformComponent>(
        ComponentTypes.TRANSFORM
      );
      if (transform) {
        this.logger.debug(
          `Applied periodic impulse to box ${
            box.id
          } at position (${transform.position.x.toFixed(
            2
          )}, ${transform.position.y.toFixed(
            2
          )}, ${transform.position.z.toFixed(2)})`
        );
      }
    });

    if (dynamicBoxes.length > 0) {
      this.logger.info(
        `Applied random impulses to ${dynamicBoxes.length} boxes`
      );
    }
  }

  // Store cleanup callbacks
  private cleanupCallbacks: (() => void)[] = [];
}

export default PhysicsCollisionLevel;
