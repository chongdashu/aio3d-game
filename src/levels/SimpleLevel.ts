import * as THREE from "three";
import type { Level } from "aio3d-core";
import {
  World,
  Entity,
  ComponentTypes,
  RenderSystem,
  SceneSystem,
  CameraComponent,
  WindowSystem,
  PrefabService,
  LevelService,
  loggingService,
  prefabRegistry,
} from "aio3d-core";

// Import prefab definitions to ensure registration
import "../prefabs/GroundPlanePrefab";
import { createBackButtonPrefab } from "../prefabs/BackButtonPrefab";

/**
 * SimpleScene that displays a cube with lighting, using the prefab system.
 */
export class SimpleLevel implements Level {
  private world: World;
  private sceneSystem: SceneSystem;
  private renderSystem: RenderSystem;
  private windowSystem: WindowSystem;
  private prefabService: PrefabService;
  private container: HTMLElement;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private levelService: LevelService | null = null;
  private logger = loggingService.createClassLogger(this);

  // UI elements
  private uiContainer: HTMLElement | null = null;

  // Camera settings
  private readonly CAMERA_SETTINGS = {
    position: new THREE.Vector3(3, 3, 7),
    lookAt: new THREE.Vector3(0, 0.5, 0),
    fov: 60,
  };

  /**
   * Creates a new SimpleScene
   * @param container - The container element to render to
   * @param world - The ECS world instance.
   * @param prefabService - The service for creating entities from prefabs.
   * @param levelService - Optional level service for level transitions
   */
  constructor(
    container: HTMLElement,
    world: World,
    prefabService: PrefabService,
    levelService?: LevelService
  ) {
    this.container = container;
    this.world = world;
    this.prefabService = prefabService;
    this.levelService = levelService || null;

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
      const error =
        "Required systems (Scene, Render, Window) not found in the world.";
      this.logger.error(error);
      throw new Error(`SimpleLevel Error: ${error}`);
    }
    this.sceneSystem = sceneSys;
    this.renderSystem = renderSys;
    this.windowSystem = windowSys;
  }

  /**
   * Sets up the DOM-based UI
   */
  private setupUI(): void {
    this.logger.info("Setting up DOM UI");

    // Ensure container is available (should be, via persistent entity)
    if (!this.container) {
      this.logger.error("Main container not found!");
      return;
    }

    // Create UI container
    const uiContainer = document.createElement("div");
    uiContainer.className = "game-ui";
    this.container.appendChild(uiContainer);

    // Create back button using prefab
    const backButtonPrefab = createBackButtonPrefab({
      onBackClick: () => {
        if (this.levelService) {
          this.logger.info("Back button clicked - returning to menu");
          this.levelService.changeLevel("R3_MENU");
        } else {
          this.logger.warn(
            "Cannot navigate to menu - LevelService not available"
          );
        }
      },
    });

    // Register and create the back button entity
    prefabRegistry.registerPrefab(backButtonPrefab);
    const backButtonEntity = this.prefabService.createEntityFromPrefab(
      backButtonPrefab.name
    );

    if (!backButtonEntity) {
      this.logger.error("Failed to create back button entity");
      return;
    }

    // Add CSS styles
    this.addStyles();
  }

  /**
   * Adds CSS styles for the UI
   */
  private addStyles(): void {
    const style = document.createElement("style");
    style.textContent = `
      .game-ui {
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 100;
      }

      .back-button:hover {
        background: rgba(0, 0, 0, 0.9) !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
      }

      .back-button:active {
        transform: translateY(0) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Sets up the camera entity
   */
  private setupCamera(): void {
    this.logger.info("Setting up camera");
    const cameraEntity = new Entity();
    const cameraComponent = new CameraComponent(
      this.container.clientWidth,
      this.container.clientHeight,
      this.CAMERA_SETTINGS.fov
    );

    // Set camera position and orientation using type assertions to handle version mismatch
    cameraComponent.camera.position.set(
      this.CAMERA_SETTINGS.position.x,
      this.CAMERA_SETTINGS.position.y,
      this.CAMERA_SETTINGS.position.z
    );
    cameraComponent.camera.lookAt(
      this.CAMERA_SETTINGS.lookAt.x,
      this.CAMERA_SETTINGS.lookAt.y,
      this.CAMERA_SETTINGS.lookAt.z
    );

    cameraEntity.addComponent(ComponentTypes.CAMERA, cameraComponent);
    this.world.addEntity(cameraEntity);

    // Add camera to scene
    this.sceneSystem.addToScene(cameraComponent.camera);

    this.logger.debug("Camera setup complete", {
      position: cameraComponent.camera.position,
      lookAt: this.CAMERA_SETTINGS.lookAt,
      fov: this.CAMERA_SETTINGS.fov,
    });
  }

  /**
   * Sets up scene lighting
   */
  private setupLighting(): void {
    this.logger.info("Setting up lighting");
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
    this.logger.debug("Lighting setup complete", {
      ambientIntensity: 0.5,
      directionalIntensity: 1.2,
      shadowMapSize: 2048,
      shadowBounds: shadowSize,
    });
  }

  /**
   * Adds a ground plane to the scene using the prefab system.
   */
  private addGroundPlane(): void {
    this.logger.info("Adding ground plane");
    // Use the prefab service to create the ground plane entity
    const groundEntity =
      this.prefabService.createEntityFromPrefab("GroundPlane");

    if (!groundEntity) {
      this.logger.error("Failed to create ground plane entity from prefab.");
      return;
    }

    this.logger.debug(
      `Ground plane entity (ID: ${groundEntity.id}) created via prefab successfully.`
    );
  }

  /**
   * Adds a spinning cube to the scene using the prefab system.
   */
  private addSpinningCube(): void {
    this.logger.info("Adding spinning cube");
    // Use the prefab service to create the entity by its registered name
    const cubeEntity =
      this.prefabService.createEntityFromPrefab("SpinningCube");

    if (!cubeEntity) {
      this.logger.error("Failed to create spinning cube entity from prefab.");
      return;
    }

    // NO NEED to add mesh to scene here!
    // The MeshRegistrationSystem listens for the 'entityCreatedFromPrefab' event
    // and handles adding the mesh (from SpinningCubeComponent or MeshComponent)
    // to the SceneSystem.
    this.logger.debug(
      `Spinning cube entity (ID: ${cubeEntity.id}) created via prefab successfully.`
    );
  }

  /**
   * Starts the animation loop
   */
  public start(): void {
    this.logger.info("start() called");

    // Clear the scene first to avoid duplicates
    const scene = this.sceneSystem.getScene();
    this.logger.debug("Initial scene children count:", scene.children.length);

    // Add a small delay before initializing to ensure previous level cleanup is complete
    setTimeout(() => {
      this.initializeLevel();
    }, 50);
  }

  /**
   * Initialize the level after a delay
   */
  private async initializeLevel(): Promise<void> {
    try {
      this.logger.info("Initializing level");

      // Access and configure renderer
      const renderer = this.sceneSystem.getRenderer();
      const canvas = renderer.domElement;

      // Add context loss listener
      canvas.addEventListener("webglcontextlost", this.handleContextLoss);

      // Force renderer reinitialization to ensure clean WebGL context
      await this.sceneSystem.reinitializeRenderer();

      // Setup event listeners for context recovery
      const newCanvas = this.sceneSystem.getRenderer().domElement;
      newCanvas.addEventListener(
        "webglcontextrestored",
        this.handleContextRestored
      );

      // Only proceed if renderer is ready
      if (this.sceneSystem.isRendererReady()) {
        // Set up the scene (DOM entity is now persistent)
        this.setupCamera();
        this.setupLighting();
        this.addGroundPlane();
        this.addSpinningCube();
        this.setupUI();

        this.logger.debug(
          "Scene setup complete. Scene children count:",
          this.sceneSystem.getScene().children.length
        );

        // Log the camera and other critical objects
        const cameraEntities = this.world.queryComponents([
          ComponentTypes.CAMERA,
        ]);
        this.logger.debug("Camera entities found:", cameraEntities.length);

        const renderables = this.world.queryComponents([
          ComponentTypes.TRANSFORM,
          ComponentTypes.MESH,
        ]);
        this.logger.debug("Renderable entities found:", renderables.length);

        if (this.animationFrameId === null) {
          this.lastTime = performance.now();
          this.animate();
          this.logger.info("Animation loop started");
        }
      } else {
        this.logger.error("Failed to initialize renderer");
      }
    } catch (error) {
      this.logger.error("Error during initializeLevel()", error);
    }
  }

  /**
   * Handle WebGL context loss
   */
  private handleContextLoss = (event: Event): void => {
    this.logger.warn("WebGL context lost, preventing default");
    event.preventDefault();

    // Stop animation loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.logger.info("Will attempt context recovery");
  };

  /**
   * Handle WebGL context restoration
   */
  private handleContextRestored = (): void => {
    this.logger.info("WebGL context restored, reinitializing scene");

    // Reinitialize the scene
    this.sceneSystem.reinitializeRenderer();
    this.setupCamera();
    this.setupLighting();

    // Restart animation loop if needed
    if (this.animationFrameId === null) {
      this.lastTime = performance.now();
      this.animate();
    }
  };

  /**
   * Animation loop
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    try {
      // Update world (which updates all systems)
      this.world.update(deltaTime);

      // Only render if renderer is ready
      if (this.sceneSystem.isRendererReady()) {
        this.render();
      }
    } catch (error) {
      this.logger.error("Error in animation loop", error);
      this.stop(); // Stop the animation loop if there's an error
    }
  }

  /**
   * Renders the scene
   */
  private render(): void {
    // Only proceed if renderer is ready
    if (!this.sceneSystem.isRendererReady()) {
      return;
    }

    const cameraEntities = this.world.queryComponents([ComponentTypes.CAMERA]);
    const cameraEntity = cameraEntities[0];

    if (cameraEntity) {
      const cameraComponent = cameraEntity.getComponent(
        ComponentTypes.CAMERA
      ) as CameraComponent;

      if (cameraComponent) {
        const camera = cameraComponent.getCamera();
        this.sceneSystem.render(camera);
      }
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
    this.logger.info("cleanup() called");
    this.stop();

    // Remove UI elements from DOM
    if (this.uiContainer && this.container.contains(this.uiContainer)) {
      this.container.removeChild(this.uiContainer);
      this.uiContainer = null;
    }
  }

  /**
   * Stops the animation loop
   */
  public stop(): void {
    this.logger.info("stop() called");
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove context event listeners
    const canvas = this.sceneSystem.getRenderer().domElement;
    canvas.removeEventListener("webglcontextlost", this.handleContextLoss);
    canvas.removeEventListener(
      "webglcontextrestored",
      this.handleContextRestored
    );
  }
}
