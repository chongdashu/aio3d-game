import * as THREE from "three";
import {
  World,
  Entity,
  ComponentTypes,
  RenderSystem,
  SceneSystem,
  CameraComponent,
  WindowSystem,
  DOMComponent,
  PrefabService,
} from "aio3d-core";

// Import prefab definitions to ensure registration
import "../prefabs/GroundPlanePrefab";

/**
 * SimpleScene that displays a cube with lighting, using the prefab system.
 */
export class SimpleLevel {
  private world: World;
  private sceneSystem: SceneSystem;
  private renderSystem: RenderSystem;
  private windowSystem: WindowSystem;
  private prefabService: PrefabService;
  private container: HTMLElement;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  // Camera settings
  private readonly CAMERA_SETTINGS = {
    position: new THREE.Vector3(3, 3, 7) as THREE.Vector3,
    lookAt: new THREE.Vector3(0, 0.5, 0) as THREE.Vector3,
    fov: 60,
  };

  /**
   * Creates a new SimpleScene
   * @param container - The container element to render to
   * @param world - The ECS world instance.
   * @param prefabService - The service for creating entities from prefabs.
   */
  constructor(
    container: HTMLElement,
    world: World,
    prefabService: PrefabService
  ) {
    this.container = container;
    this.world = world;
    this.prefabService = prefabService;

    // Get systems from the world instead of creating them here
    // Assumes systems were added to the world in main.ts or elsewhere
    const sceneSys = world
      .getSystems()
      .find((sys): sys is SceneSystem => sys instanceof SceneSystem);
    const renderSys = world
      .getSystems()
      .find((sys): sys is RenderSystem => sys instanceof RenderSystem);
    const windowSys = world
      .getSystems()
      .find((sys): sys is WindowSystem => sys instanceof WindowSystem);

    if (!sceneSys || !renderSys || !windowSys) {
      throw new Error(
        "SimpleLevel Error: Required systems (Scene, Render, Window) not found in the world."
      );
    }
    this.sceneSystem = sceneSys;
    this.renderSystem = renderSys;
    this.windowSystem = windowSys;

    // Set up DOM entity first
    this.setupDOMEntity();

    // Set up camera
    this.setupCamera();

    // Set up lighting
    this.setupLighting();

    // Add a ground plane
    this.addGroundPlane();

    // Add a spinning cube
    this.addSpinningCube();
  }

  /**
   * Sets up the DOM entity
   */
  private setupDOMEntity(): void {
    const domEntity = new Entity();
    const domComponent = new DOMComponent(this.container);
    domEntity.addComponent(ComponentTypes.DOM, domComponent);
    this.world.addEntity(domEntity);
  }

  /**
   * Sets up the camera entity
   */
  private setupCamera(): void {
    const cameraEntity = new Entity();
    const cameraComponent = new CameraComponent(
      this.container.clientWidth,
      this.container.clientHeight,
      this.CAMERA_SETTINGS.fov
    );

    // Set camera position and orientation
    cameraComponent.camera.position.copy(this.CAMERA_SETTINGS.position);
    cameraComponent.camera.lookAt(this.CAMERA_SETTINGS.lookAt);

    cameraEntity.addComponent(ComponentTypes.CAMERA, cameraComponent);
    this.world.addEntity(cameraEntity);

    // Add camera to scene
    this.sceneSystem.addToScene(cameraComponent.camera as any);
  }

  /**
   * Sets up scene lighting
   */
  private setupLighting(): void {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.sceneSystem.addToScene(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 8, 7.5);
    directionalLight.castShadow = true;

    // Configure shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.bias = -0.0001;

    // Set up shadow camera bounds
    const shadowSize = 10;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;

    this.sceneSystem.addToScene(directionalLight);
  }

  /**
   * Adds a ground plane to the scene using the prefab system.
   */
  private addGroundPlane(): void {
    // Use the prefab service to create the ground plane entity
    const groundEntity =
      this.prefabService.createEntityFromPrefab("GroundPlane");

    if (!groundEntity) {
      console.error(
        "SimpleLevel: Failed to create ground plane entity from prefab."
      );
      return;
    }

    console.log(
      `SimpleLevel: Ground plane entity (ID: ${groundEntity.id}) created via prefab successfully.`
    );
  }

  /**
   * Adds a spinning cube to the scene using the prefab system.
   */
  private addSpinningCube(): void {
    // Use the prefab service to create the entity by its registered name
    const cubeEntity =
      this.prefabService.createEntityFromPrefab("SpinningCube");

    if (!cubeEntity) {
      console.error(
        "SimpleLevel: Failed to create spinning cube entity from prefab."
      );
      // Handle error appropriately, maybe throw or log further
      return;
    }

    // NO NEED to add mesh to scene here!
    // The MeshRegistrationSystem listens for the 'entityCreatedFromPrefab' event
    // and handles adding the mesh (from SpinningCubeComponent or MeshComponent)
    // to the SceneSystem.
    console.log(
      `SimpleLevel: Spinning cube entity (ID: ${cubeEntity.id}) created via prefab successfully.`
    );
  }

  /**
   * Starts the animation loop
   */
  public start(): void {
    if (this.animationFrameId === null) {
      this.lastTime = performance.now();
      this.animate();
    }
  }

  /**
   * Stops the animation loop
   */
  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Animation loop
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Update world (which updates all systems)
    this.world.update(deltaTime);

    // Render the scene
    this.render();
  }

  /**
   * Renders the scene
   */
  private render(): void {
    const cameraEntities = this.world.queryComponents([ComponentTypes.CAMERA]);
    const cameraEntity = cameraEntities[0];

    if (cameraEntity) {
      const cameraComponent = cameraEntity.getComponent(
        ComponentTypes.CAMERA
      ) as CameraComponent;
      const camera = cameraComponent.getCamera();
      // Use type assertion to handle Three.js version incompatibility
      this.sceneSystem.render(camera as any);
    }
  }

  /**
   * Gets the world instance
   */
  public getWorld(): World {
    return this.world;
  }

  /**
   * Cleans up resources
   */
  public cleanup(): void {
    this.stop();
    this.world.reset();
  }
}
