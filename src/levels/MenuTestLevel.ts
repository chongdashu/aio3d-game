import * as THREE from "three";
import type { Level } from "aio3d-core";
import {
  World,
  Entity,
  ComponentTypes,
  SceneSystem,
  CameraComponent,
  PrefabService,
  LevelService,
  prefabRegistry,
  loggingService,
} from "aio3d-core";
import { GameUIRegistrationSystem } from "../systems/ui/GameUIRegistrationSystem";

import { createMenuItemPrefab } from "../prefabs/MenuItemPrefab";
import { GameComponentTypes } from "../components/GameComponentTypes";

/**
 * Test level for verifying menu item implementation
 */
export class MenuTestLevel implements Level {
  private world: World;
  private sceneSystem: SceneSystem;
  private uiSystem: GameUIRegistrationSystem;
  private prefabService: PrefabService;
  private container: HTMLElement;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private levelService: LevelService;
  private camera: THREE.PerspectiveCamera | null = null;
  private logger = loggingService.createClassLogger(this);

  // Camera settings
  private readonly CAMERA_SETTINGS = {
    position: new THREE.Vector3(0, 0, 5),
    lookAt: new THREE.Vector3(0, 0, 0),
    fov: 60,
  };

  /**
   * Creates a new MenuTestLevel
   */
  constructor(
    container: HTMLElement,
    world: World,
    prefabService: PrefabService,
    levelService: LevelService
  ) {
    this.container = container;
    this.world = world;
    this.prefabService = prefabService;
    this.levelService = levelService;

    // Get required systems
    const sceneSys = world
      .getSystems()
      .find((sys): sys is SceneSystem => sys instanceof SceneSystem);
    const uiSys = world
      .getSystems()
      .find(
        (sys): sys is GameUIRegistrationSystem =>
          sys instanceof GameUIRegistrationSystem
      );

    if (!sceneSys) {
      this.logger.error("SceneSystem not found in world");
      throw new Error("SceneSystem not found in world");
    }
    if (!uiSys) {
      this.logger.error("GameUIRegistrationSystem not found in world");
      throw new Error("GameUIRegistrationSystem not found in world");
    }

    this.sceneSystem = sceneSys;
    this.uiSystem = uiSys;
  }

  /**
   * Sets up the camera
   */
  private setupCamera(): void {
    this.logger.info("Setting up camera");
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    // Add camera to scene system
    this.sceneSystem.addToScene(this.camera);

    this.logger.debug("Camera setup complete", {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      fov: this.camera.fov,
      aspect: this.camera.aspect,
    });
  }

  /**
   * Sets up lighting
   */
  private setupLighting(): void {
    this.logger.info("Setting up lighting");
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);

    this.sceneSystem.addToScene(ambientLight);
    this.sceneSystem.addToScene(directionalLight);

    this.logger.debug("Lighting setup complete", {
      ambientLight: { intensity: ambientLight.intensity },
      directionalLight: {
        intensity: directionalLight.intensity,
        position: {
          x: directionalLight.position.x,
          y: directionalLight.position.y,
          z: directionalLight.position.z,
        },
      },
    });
  }

  /**
   * Creates test menu items
   */
  private createMenuItems(): void {
    this.logger.info("Creating menu items");

    const menuItems = [
      {
        text: "Start Game",
        callback: () => this.logger.info("Start Game clicked"),
        y: 1,
      },
      {
        text: "Options",
        callback: () => this.logger.info("Options clicked"),
        y: 0,
      },
      {
        text: "Exit",
        callback: () => this.logger.info("Exit clicked"),
        y: -1,
      },
    ];

    menuItems.forEach((item, index) => {
      this.logger.debug(`Creating menu item: ${item.text}`, { index });
      const prefab = createMenuItemPrefab({
        text: item.text,
        callback: item.callback,
        position: new THREE.Vector3(0, item.y, 0),
      });

      // Register the prefab with a unique name
      const prefabName = `menuItem_${index}`;
      prefabRegistry.registerPrefab(prefab);

      // Create entity from the registered prefab
      const entity = this.prefabService.createEntityFromPrefab(prefab.name);
      if (entity) {
        this.logger.debug(
          `Successfully created entity for menu item: ${item.text}`,
          { entityId: entity.id }
        );
      } else {
        this.logger.error(
          `Failed to create entity for menu item: ${item.text}`
        );
      }
    });

    this.logger.info("Menu items creation complete");
  }

  /**
   * Renders the scene
   */
  private render(): void {
    if (this.camera) {
      // Cast to Camera for render method
      this.sceneSystem.render(this.camera as THREE.Camera);
    }
  }

  /**
   * Starts the level
   */
  public start(): void {
    this.logger.info("Starting menu test level");
    this.setupCamera();
    this.setupLighting();
    this.createMenuItems();
    this.animate();

    this.logger.debug("Scene state", {
      entities: this.world.getSystems().length,
      menuItems: this.world.queryComponents([GameComponentTypes.MENU_ITEM])
        .length,
    });
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    try {
      this.world.update(0);
      this.render();
      this.animationFrameId = requestAnimationFrame(this.animate);
    } catch (error) {
      this.logger.error("Error in animation loop", { error });
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
      }
    }
  };

  /**
   * Cleans up resources
   */
  public cleanup(): void {
    this.logger.info("Cleaning up menu test level");
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.logger.debug("Animation frame cancelled");
    }
  }

  public stop(): void {
    this.logger.info("Stopping menu test level");
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.logger.debug("Animation frame cancelled");
    }
  }
}
