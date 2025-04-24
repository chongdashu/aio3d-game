import {
  Entity,
  ComponentTypes,
  prefabRegistry,
  createOrbitCameraPrefab,
  MeshComponent,
  TransformComponent,
  PhysicsEvents,
} from "aio3d-core";
import { BaseLevel } from "@/levels/BaseLevel";
import * as THREE from "three";
import { PhysicsDebugSystem } from "@/systems/PhysicsDebugSystem";

// Ensure ground plane prefab is registered
import "@/prefabs/simple/GroundPlanePrefab";

/**
 * Demonstrates sensor/overlap events using a static sensor volume.
 */
export class PhysicsOverlapLevel extends BaseLevel {
  protected setupLevel(): void {
    // ----- Camera Setup -----
    const cameraPrefab = createOrbitCameraPrefab({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      target: new THREE.Vector3(0, 2, 0),
      distance: 15,
      fov: 60,
      orbitSettings: {
        enableZoom: true,
        enablePan: true,
      },
    });
    prefabRegistry.registerPrefab(cameraPrefab);
    this.prefabService.createEntityFromPrefab(cameraPrefab.name);

    // ----- Lighting -----
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

    // Add physics debug visualization
    const physicsDebugSystem = new PhysicsDebugSystem();
    this.world.addSystem(physicsDebugSystem);
    physicsDebugSystem.initialize(this.world);

    // Sensor volume
    const sensor = new Entity();
    // Create proper Transform with THREE.js objects
    const sensorTransform = new TransformComponent();
    sensorTransform.position.set(0, 2, 0);
    sensorTransform.rotation.set(0, 0, 0);
    sensorTransform.scale.set(1, 1, 1);
    sensor.addComponent(ComponentTypes.TRANSFORM, sensorTransform);
    sensor.addComponent(ComponentTypes.RIGID_BODY, { bodyType: "static" });

    // Add sensor collider - ensure isSensor flag is true
    const sensorCollider = {
      shape: "box",
      size: [3, 2, 3], // Make larger for better visibility and overlap detection
      isSensor: true,
    };
    sensor.addComponent(ComponentTypes.COLLIDER, sensorCollider);

    // Verify sensor configuration
    this.logger.warn(`Sensor configuration: ${JSON.stringify(sensorCollider)}`);

    // Use proper MeshComponent instance with more visible appearance
    const sensorGeom = new THREE.BoxGeometry(3, 2, 3); // Match collider size
    const sensorMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff, // Cyan color for better visibility
      transparent: true,
      opacity: 0.5, // Slightly more opaque
      wireframe: false, // Show faces, not just wireframe
      side: THREE.DoubleSide, // Visible from inside too
    });

    // Add wireframe to highlight edges
    const sensorWireframeGeom = new THREE.BoxGeometry(3.05, 2.05, 3.05); // Slightly larger
    const sensorWireframeMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff, // Magenta wireframe
      wireframe: true,
      transparent: false,
    });

    const sensorMeshComp = new MeshComponent(sensorGeom, sensorMat);
    sensor.addComponent(ComponentTypes.MESH, sensorMeshComp);

    // Create a wireframe mesh and add it to the sensor mesh
    const wireframeMesh = new THREE.Mesh(
      sensorWireframeGeom,
      sensorWireframeMat
    );
    sensorMeshComp.mesh.add(wireframeMesh);

    this.world.addEntity(sensor);

    // Register sensor mesh with scene
    const sensorMeshCompRetrieved = sensor.getComponent<MeshComponent>(
      ComponentTypes.MESH
    );
    if (sensorMeshCompRetrieved) {
      this.sceneSystem.addToScene(sensorMeshCompRetrieved.getMesh());
    }

    // Dynamic box that will pass through the sensor
    const box = new Entity();
    // Create proper Transform with THREE.js objects and random rotation
    const boxTransform = new TransformComponent();
    boxTransform.position.set(0, 8, 0);

    // Add random rotation for more interesting physics
    boxTransform.rotation.set(
      Math.random() * Math.PI * 2, // Random X rotation
      Math.random() * Math.PI * 2, // Random Y rotation
      Math.random() * Math.PI * 2 // Random Z rotation
    );

    boxTransform.scale.set(1, 1, 1);
    box.addComponent(ComponentTypes.TRANSFORM, boxTransform);

    // Add physics with better parameters
    box.addComponent(ComponentTypes.RIGID_BODY, {
      bodyType: "dynamic",
      mass: 2,
      gravityScale: 1.5, // More reasonable gravity scale
      linearDamping: 0.01, // Low damping for natural movement
      angularDamping: 0.05, // Allow rotation
    });

    box.addComponent(ComponentTypes.COLLIDER, {
      shape: "box",
      size: [1, 1, 1],
      restitution: 0.3, // Add some bounciness
      friction: 0.8, // Good friction
    });

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
    this.world.addEntity(box);
    // Register box mesh with scene
    const boxMeshCompRetrieved = box.getComponent<MeshComponent>(
      ComponentTypes.MESH
    );
    if (boxMeshCompRetrieved) {
      this.sceneSystem.addToScene(boxMeshCompRetrieved.getMesh());
    }

    // Create a few more boxes with different positions and colors
    this.createAdditionalBox(2, 10, 2, 0xff0000);
    this.createAdditionalBox(-2, 12, -2, 0x00ff00);
    this.createAdditionalBox(-1, 9, 1, 0x0000ff);

    // Force stronger gravity to ensure objects fall
    this.enforcePhysicsMovement();

    // Set up overlap handlers with the correct event format
    this.setupOverlapHandlers();

    // Remove old event listeners - they won't be triggered
    this.world.eventBus.off(PhysicsEvents.LEGACY_OVERLAP_START, () => {});
    this.world.eventBus.off(PhysicsEvents.LEGACY_OVERLAP_END, () => {});

    // Test the collision event system with a manually triggered event
    setTimeout(() => {
      this.logger.warn("Testing collision event system with a manual emission");
      const sensorEntities = this.world
        .queryComponents([ComponentTypes.RIGID_BODY, ComponentTypes.COLLIDER])
        .filter((entity) => {
          const collider = entity.getComponent(ComponentTypes.COLLIDER);
          return collider && (collider as any).isSensor === true;
        });

      if (sensorEntities.length > 0) {
        const sensorId = sensorEntities[0].id;

        // Find the first dynamic box
        const dynamicBoxes = this.world
          .queryComponents([ComponentTypes.RIGID_BODY])
          .filter((entity) => {
            const rb = entity.getComponent(ComponentTypes.RIGID_BODY);
            return rb && (rb as any).bodyType === "dynamic";
          });

        if (dynamicBoxes.length > 0) {
          const boxId = dynamicBoxes[0].id;

          // Manually emit a collision event
          this.logger.warn(
            `Emitting test collision between sensor ${sensorId} and box ${boxId}`
          );
          this.world.eventBus.emit(PhysicsEvents.COLLISION_START, {
            bodyA: sensorId,
            bodyB: boxId,
          });

          // Test end after 3 seconds
          setTimeout(() => {
            this.logger.warn(
              `Emitting test collision end between sensor ${sensorId} and box ${boxId}`
            );
            this.world.eventBus.emit(PhysicsEvents.COLLISION_END, {
              bodyA: sensorId,
              bodyB: boxId,
            });
          }, 3000);
        }
      }
    }, 5000); // Wait 5 seconds after setup before testing
  }

  protected cleanupLevelSpecifics(): void {
    // Run any stored cleanup callbacks
    this.cleanupCallbacks.forEach((callback) => callback());
    this.cleanupCallbacks = [];

    this.logger.info("Physics Overlap Level cleaned up");
  }

  protected recreateSceneAfterContextRestore(): void {
    this.setupLevel();
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
   * Create an additional box with physics
   */
  private createAdditionalBox(
    x: number,
    y: number,
    z: number,
    color: number
  ): void {
    const box = new Entity();

    // Create transform with random rotation
    const transform = new TransformComponent();
    transform.position.set(x, y, z);

    // Random rotation for natural movement
    transform.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    transform.scale.set(1, 1, 1);
    box.addComponent(ComponentTypes.TRANSFORM, transform);

    // Add physics with varied parameters
    box.addComponent(ComponentTypes.RIGID_BODY, {
      bodyType: "dynamic",
      mass: 1 + Math.random() * 2, // Random mass between 1-3
      gravityScale: 1.5,
      linearDamping: 0.01,
      angularDamping: 0.05,
    });

    box.addComponent(ComponentTypes.COLLIDER, {
      shape: "box",
      size: [1, 1, 1],
      restitution: 0.3,
      friction: 0.8,
    });

    // Create mesh
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.2,
    });

    const meshComp = new MeshComponent(geom, mat);
    meshComp.mesh.castShadow = true;
    meshComp.mesh.receiveShadow = true;
    box.addComponent(ComponentTypes.MESH, meshComp);

    this.world.addEntity(box);

    // Add to scene
    this.sceneSystem.addToScene(meshComp.getMesh());
  }

  /**
   * Enforce physics movement by adding forces and testing gravity
   */
  private enforcePhysicsMovement(): void {
    // Adjust physics properties on all rigid bodies
    const physicsEntities = this.world.queryComponents([
      ComponentTypes.RIGID_BODY,
    ]);

    this.logger.info(
      `Found ${physicsEntities.length} physics entities to apply gravity to`
    );

    for (const entity of physicsEntities) {
      const rigidBody = entity.getComponent(ComponentTypes.RIGID_BODY);
      if (rigidBody) {
        // Use reasonable physics settings
        (rigidBody as any).gravityScale = 1.5; // More natural gravity
        (rigidBody as any).linearDamping = 0.01; // Low damping
        (rigidBody as any).angularDamping = 0.05; // Allow rotation

        // Add debug properties
        (rigidBody as any).debugPhysics = true;

        this.logger.info(`Adjusted physics properties for entity ${entity.id}`);
      }
    }

    // Apply initial impulse to kickstart movement
    this.applyInitialImpulse();

    // Also set up periodic impulses to ensure continued movement
    const impulseInterval = setInterval(() => {
      this.applyPeriodicImpulse();
    }, 10000); // Apply every 10 seconds instead of 3 seconds to reduce noise

    this.cleanupCallbacks.push(() => clearInterval(impulseInterval));
  }

  /**
   * Apply initial impulse to dynamic bodies
   */
  private applyInitialImpulse(): void {
    setTimeout(() => {
      // Query for entities that can receive physics impulses
      const entities = this.world.queryComponents([
        ComponentTypes.TRANSFORM,
        ComponentTypes.RIGID_BODY,
        ComponentTypes.MESH,
      ]);

      // Filter to get only valid dynamic bodies
      const dynamicBoxes = entities.filter((entity) => {
        const rb = entity.getComponent(ComponentTypes.RIGID_BODY);
        const transform = entity.getComponent<TransformComponent>(
          ComponentTypes.TRANSFORM
        );

        // First check basic criteria
        const isDynamicAndAboveGround =
          rb &&
          (rb as any).bodyType === "dynamic" &&
          transform &&
          transform.position.y > 0.5;

        if (!isDynamicAndAboveGround) return false;

        // Now verify the entity is registered with the physics system
        let hasRegisteredBody = false;
        this.world.eventBus.emit(PhysicsEvents.CHECK_ENTITY, {
          entityId: entity.id,
          callback: (exists: boolean) => {
            hasRegisteredBody = exists;
          },
        });

        return hasRegisteredBody;
      });

      this.logger.info(
        `Found ${dynamicBoxes.length} dynamic boxes for initial impulse`
      );

      // Apply impulses to all dynamic boxes
      if (dynamicBoxes.length > 0) {
        dynamicBoxes.forEach((box) => {
          // Apply varied initial impulse with randomness
          const impulse = {
            x: (Math.random() - 0.5) * 1.0, // Random X force
            y: -5 - Math.random() * 2, // Downward force with randomness
            z: (Math.random() - 0.5) * 1.0, // Random Z force
          };

          this.world.eventBus.emit(PhysicsEvents.APPLY_IMPULSE, {
            entityId: box.id,
            impulse,
          });

          // Also apply torque for rotation
          this.world.eventBus.emit(PhysicsEvents.APPLY_TORQUE_IMPULSE, {
            entityId: box.id,
            torque: {
              x: (Math.random() - 0.5) * 1.0,
              y: (Math.random() - 0.5) * 1.0,
              z: (Math.random() - 0.5) * 1.0,
            },
          });

          // Log the transform for debugging
          const transform = box.getComponent<TransformComponent>(
            ComponentTypes.TRANSFORM
          );
          if (transform) {
            this.logger.info(
              `Box ${box.id} initial position: (${transform.position.x.toFixed(
                2
              )}, ${transform.position.y.toFixed(
                2
              )}, ${transform.position.z.toFixed(2)})`
            );
          }
        });

        this.logger.info(
          `Applied initial impulses to ${dynamicBoxes.length} boxes`
        );
      }
    }, 1000);
  }

  /**
   * Apply periodic impulses to keep things moving if needed
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

    // Query all potential dynamic entities
    const entities = this.world.queryComponents([
      ComponentTypes.TRANSFORM,
      ComponentTypes.RIGID_BODY,
      ComponentTypes.MESH,
    ]);

    // Filter to get only valid dynamic bodies
    const dynamicBoxes = entities.filter((entity) => {
      const rb = entity.getComponent(ComponentTypes.RIGID_BODY);
      const transform = entity.getComponent<TransformComponent>(
        ComponentTypes.TRANSFORM
      );

      // First check basic criteria
      const isDynamicAndAboveGround =
        rb &&
        (rb as any).bodyType === "dynamic" &&
        transform &&
        transform.position.y > 0.5;

      if (!isDynamicAndAboveGround) return false;

      // Now verify the entity is registered with the physics system
      let hasRegisteredBody = false;
      this.world.eventBus.emit(PhysicsEvents.CHECK_ENTITY, {
        entityId: entity.id,
        callback: (exists: boolean) => {
          hasRegisteredBody = exists;
        },
      });

      if (!hasRegisteredBody) {
        this.logger.debug(
          `Skipping entity ${entity.id} - has components but not registered with physics system`
        );
      }

      return hasRegisteredBody;
    });

    // Only apply to boxes that appear to be stuck
    dynamicBoxes.forEach((box) => {
      const transform = box.getComponent<TransformComponent>(
        ComponentTypes.TRANSFORM
      );
      if (transform) {
        // Random impulse in X and Z directions to create more dynamic motion
        const impulse = {
          x: (Math.random() - 0.5) * 5,
          y: -5, // Always push down
          z: (Math.random() - 0.5) * 5,
        };

        this.world.eventBus.emit(PhysicsEvents.APPLY_IMPULSE, {
          entityId: box.id,
          impulse,
        });

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
      this.logger.debug(
        `Applied periodic impulses to ${dynamicBoxes.length} dynamic boxes`
      );
    }
  }

  // Store cleanup callbacks
  private cleanupCallbacks: (() => void)[] = [];

  /**
   * Sets up overlap event listeners for sensor detection
   */
  private setupOverlapHandlers(): void {
    // Remove old event handlers if any
    this.world.eventBus.off(PhysicsEvents.LEGACY_OVERLAP_START, () => {});
    this.world.eventBus.off(PhysicsEvents.LEGACY_OVERLAP_END, () => {});

    // Get sensor entity ID for reference
    const sensorEntities = this.world
      .queryComponents([ComponentTypes.RIGID_BODY, ComponentTypes.COLLIDER])
      .filter((entity) => {
        const collider = entity.getComponent(ComponentTypes.COLLIDER);
        return collider && (collider as any).isSensor === true;
      });

    if (sensorEntities.length === 0) {
      this.logger.warn("No sensor entities found for overlap detection");
      return;
    }

    const sensorId = sensorEntities[0].id;
    this.logger.info(`Setting up collision detection for sensor ${sensorId}`);

    // Store references to handler functions
    const handleCollisionStart = (evt: any) => {
      console.log("Collision started:", evt);
      this.logger.warn(`DETAILED COLLISION EVENT: ${JSON.stringify(evt)}`);

      // Check if one of the bodies is our sensor
      if (evt.bodyA === sensorId || evt.bodyB === sensorId) {
        // The other body is the target that entered our sensor
        const targetId = evt.bodyA === sensorId ? evt.bodyB : evt.bodyA;
        this.logger.info(`TRIGGER: Object ${targetId} entered sensor zone`);

        // Change the color of the target entity
        const targetEntity = this.world.getEntity(targetId);
        if (targetEntity) {
          this.logger.info(`Found target entity: ${targetId}`);

          const meshComp = targetEntity.getComponent<MeshComponent>(
            ComponentTypes.MESH
          );

          if (meshComp) {
            this.logger.info(`Found mesh component on entity ${targetId}`);
          } else {
            this.logger.warn(`No mesh component found on entity ${targetId}`);
          }

          if (
            meshComp?.mesh &&
            meshComp.mesh.material instanceof THREE.Material
          ) {
            this.logger.info(`Found valid mesh material on entity ${targetId}`);

            if (!(meshComp.mesh.material as any).originalColor) {
              (meshComp.mesh.material as any).originalColor = (
                meshComp.mesh.material as THREE.MeshStandardMaterial
              ).color.clone();
              this.logger.info(`Stored original color for entity ${targetId}`);
            }

            const oldColor = (
              meshComp.mesh.material as THREE.MeshStandardMaterial
            ).color.getHex();
            (meshComp.mesh.material as THREE.MeshStandardMaterial).color.set(
              0xff0000
            );

            // Force material update
            (meshComp.mesh.material as THREE.MeshStandardMaterial).needsUpdate =
              true;

            this.logger.warn(
              `Changed color of entity ${targetId} from ${oldColor.toString(
                16
              )} to RED (0xff0000)`
            );
          } else {
            this.logger.warn(`Entity ${targetId} has no valid mesh material`);
          }
        } else {
          this.logger.warn(`Could not find target entity with ID ${targetId}`);
        }
      } else {
        this.logger.warn(
          `Collision involved entities ${evt.bodyA} and ${evt.bodyB}, but sensor ${sensorId} was not one of them`
        );
      }
    };

    const handleCollisionEnd = (evt: any) => {
      console.log("Collision ended:", evt);
      this.logger.warn(`DETAILED END EVENT: ${JSON.stringify(evt)}`);

      // Check if one of the bodies is our sensor
      if (evt.bodyA === sensorId || evt.bodyB === sensorId) {
        // The other body is the target that left our sensor
        const targetId = evt.bodyA === sensorId ? evt.bodyB : evt.bodyA;
        this.logger.info(`TRIGGER: Object ${targetId} left sensor zone`);

        // Restore the color of the target entity
        const targetEntity = this.world.getEntity(targetId);
        if (targetEntity) {
          const meshComp = targetEntity.getComponent<MeshComponent>(
            ComponentTypes.MESH
          );
          if (
            meshComp?.mesh &&
            meshComp.mesh.material instanceof THREE.Material
          ) {
            if ((meshComp.mesh.material as any).originalColor) {
              const oldColor = (
                meshComp.mesh.material as THREE.MeshStandardMaterial
              ).color.getHex();
              (meshComp.mesh.material as THREE.MeshStandardMaterial).color.copy(
                (meshComp.mesh.material as any).originalColor
              );

              // Force material update
              (
                meshComp.mesh.material as THREE.MeshStandardMaterial
              ).needsUpdate = true;

              this.logger.warn(
                `Restored original color of entity ${targetId} from ${oldColor.toString(
                  16
                )} to ${(meshComp.mesh.material as any).originalColor
                  .getHex()
                  .toString(16)}`
              );
            } else {
              this.logger.warn(
                `No original color found for entity ${targetId}`
              );
            }
          } else {
            this.logger.warn(
              `Entity ${targetId} has no valid mesh material to restore color`
            );
          }
        } else {
          this.logger.warn(
            `Could not find target entity with ID ${targetId} to restore color`
          );
        }
      } else {
        this.logger.warn(
          `End collision involved entities ${evt.bodyA} and ${evt.bodyB}, but sensor ${sensorId} was not one of them`
        );
      }
    };

    // Listen for collision events using the correct event format (bodyA/bodyB)
    this.world.eventBus.on(PhysicsEvents.COLLISION_START, handleCollisionStart);
    this.world.eventBus.on(PhysicsEvents.COLLISION_END, handleCollisionEnd);

    // Add cleanup for these handlers
    this.cleanupCallbacks.push(() => {
      this.world.eventBus.off(
        PhysicsEvents.COLLISION_START,
        handleCollisionStart
      );
      this.world.eventBus.off(PhysicsEvents.COLLISION_END, handleCollisionEnd);
    });

    this.logger.info("Overlap handlers set up successfully");
  }
}

export default PhysicsOverlapLevel;
