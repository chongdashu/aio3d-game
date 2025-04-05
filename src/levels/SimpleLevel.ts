import * as THREE from "three";
import {
  ComponentTypes,
  CameraComponent,
  prefabRegistry,
  CoreDebugUISystem,
  createDebugUIPrefab,
} from "aio3d-core";
import { BaseLevel } from "./BaseLevel";

// Import prefab definitions to ensure registration
import "../prefabs/simple/GroundPlanePrefab";
import { createBackButtonPrefab } from "../prefabs/BackButtonPrefab";
import { createOrbitCameraPrefab } from "aio3d-core/src/prefabs/camera/OrbitCameraPrefab";

/**
 * SimpleLevel that displays a cube with lighting, using the prefab system.
 */
export class SimpleLevel extends BaseLevel {
  // UI elements
  private uiContainer: HTMLElement | null = null;

  // Camera settings
  private readonly CAMERA_SETTINGS = {
    position: new THREE.Vector3(3, 3, 7),
    lookAt: new THREE.Vector3(0, 0.5, 0),
    fov: 60,
  };

  /**
   * Sets up all level-specific elements
   */
  protected setupLevel(): void {
    this.setupCamera();
    this.setupLighting();
    this.addGroundPlane();
    this.addSpinningCube();
    this.setupUI();
    this.setupDebugUI();
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
    this.uiContainer = uiContainer;

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
    this.logger.info("Setting up orbit camera");

    const cameraPrefab = createOrbitCameraPrefab({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      target: new THREE.Vector3(0, 0.5, 0),
      distance: 8,
      fov: 60,
      orbitSettings: {
        minDistance: 3,
        maxDistance: 20,
        rotationSpeed: 1.0,
        panSpeed: 1.0,
        zoomSpeed: 0.5,
      },
    });

    // Register the prefab before using it
    prefabRegistry.registerPrefab(cameraPrefab);

    const cameraEntity = this.prefabService.createEntityFromPrefab(
      cameraPrefab.name
    );

    if (!cameraEntity) {
      this.logger.error("Failed to create orbit camera entity from prefab");
      return;
    }

    this.logger.debug("Orbit camera setup complete", {
      target: new THREE.Vector3(0, 0.5, 0),
      distance: 8,
      fov: 60,
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

    this.logger.debug(
      `Spinning cube entity (ID: ${cubeEntity.id}) created via prefab successfully.`
    );
  }

  /**
   * Sets up the debug UI for monitoring camera properties
   */
  private setupDebugUI(): void {
    this.logger.info("Setting up debug UI");

    // Add and initialize the debug UI system
    const debugSystem = new CoreDebugUISystem();
    this.world.addSystem(debugSystem);
    debugSystem.initialize(this.world);
    this.logger.info("Debug UI system added and initialized");

    // Register and create debug UI entity
    const debugUIPrefab = createDebugUIPrefab();
    prefabRegistry.registerPrefab(debugUIPrefab);
    const debugUIEntity = this.prefabService.createEntityFromPrefab(
      debugUIPrefab.name
    );

    if (!debugUIEntity) {
      this.logger.error("Failed to create debug UI entity");
      return;
    }

    this.logger.info("Debug UI setup complete");
  }

  /**
   * Cleanup level-specific resources
   */
  protected cleanupLevelSpecifics(): void {
    // Remove UI elements from DOM
    if (this.uiContainer && this.container.contains(this.uiContainer)) {
      this.container.removeChild(this.uiContainer);
      this.uiContainer = null;
    }
  }

  /**
   * Recreate scene elements after context restoration
   */
  protected recreateSceneAfterContextRestore(): void {
    this.setupCamera();
    this.setupLighting();
  }
}
