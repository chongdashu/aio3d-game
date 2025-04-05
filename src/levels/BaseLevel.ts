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
} from "aio3d-core";

/**
 * BaseLevel that implements common functionality for all levels
 */
export abstract class BaseLevel implements Level {
  protected world: World;
  protected sceneSystem: SceneSystem;
  protected renderSystem: RenderSystem;
  protected windowSystem: WindowSystem;
  protected prefabService: PrefabService;
  protected container: HTMLElement;
  protected animationFrameId: number | null = null;
  protected lastTime: number = 0;
  protected levelService: LevelService | null = null;
  protected logger = loggingService.createClassLogger(this);

  /**
   * Creates a new BaseLevel
   * @param container - The container element to render to
   * @param world - The ECS world instance
   * @param prefabService - The service for creating entities from prefabs
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

    // Get systems from the world
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
      throw new Error(`BaseLevel Error: ${error}`);
    }
    this.sceneSystem = sceneSys;
    this.renderSystem = renderSys;
    this.windowSystem = windowSys;
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
  protected async initializeLevel(): Promise<void> {
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
        // Call abstract methods that subclasses will implement
        this.setupLevel();

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
  protected handleContextLoss = (event: Event): void => {
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
  protected handleContextRestored = (): void => {
    this.logger.info("WebGL context restored, reinitializing scene");

    // Reinitialize the scene
    this.sceneSystem.reinitializeRenderer();
    this.recreateSceneAfterContextRestore();

    // Restart animation loop if needed
    if (this.animationFrameId === null) {
      this.lastTime = performance.now();
      this.animate();
    }
  };

  /**
   * Animation loop
   */
  protected animate(): void {
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
  protected render(): void {
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
    this.cleanupLevelSpecifics();
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

  /**
   * Setup level-specific elements. To be implemented by subclasses.
   */
  protected abstract setupLevel(): void;

  /**
   * Clean up level-specific resources. To be implemented by subclasses.
   */
  protected abstract cleanupLevelSpecifics(): void;

  /**
   * Recreate scene elements after context restoration. To be implemented by subclasses.
   */
  protected abstract recreateSceneAfterContextRestore(): void;
}
