import { ModelComponent, Entity, TransformComponent } from 'aio3d-core';
import * as THREE from 'three';
import {
  ComponentTypes,
  CameraComponent,
  prefabRegistry,
  CoreDebugUISystem,
  createDebugUIPrefab,
  ModelSystem,
  ModelRegistrationSystem,
  AnimationControllerSystem,
  SceneSystem,
  WindowSystem,
  RenderSystem,
  OrbitControlComponent,
} from 'aio3d-core';
import { BaseLevel } from '@/levels/BaseLevel';
import { inspectAllAnimations } from '@/plugins/aiobot/utils/inspectAnimations';
import { CharacterUISystem } from '@/plugins/aiobot/systems/AioBotCharacterUISystem';

// Import prefab definitions to ensure registration
import '@/prefabs/simple/GroundPlanePrefab';
import { createAiBotPrefab } from '@/plugins/aiobot/prefabs/AiBotPrefab';
import { createBackButtonPrefab } from '@/prefabs/BackButtonPrefab';

/**
 * CharacterLevel that displays the AiBot character model with animations
 */
export class AioBotCharacterLevel extends BaseLevel {
  // UI elements
  private uiContainer: HTMLElement | null = null;

  // Character entity
  private aiBotEntity: number | null = null;

  /**
   * Sets up all level-specific elements
   */
  protected setupLevel(): void {
    // Add core systems first
    this.addCoreSystems();

    // Add model-related systems
    this.addModelSystems();

    // Add character UI system for debugging
    this.addCharacterUISystem();

    // Setup scene elements that don't require model systems
    this.setupCamera();
    this.setupLighting();
    this.addGroundPlane();
    this.setupBackButton();
    this.setupDebugUI();

    // Inspect all animations to see their correct names
    inspectAllAnimations().then(() => {
      this.logger.info('Animation inspection complete');
    }).catch(error => {
      this.logger.error('Error inspecting animations:', error);
    });

    // Add the AI Bot directly - don't wait for an event
    this.logger.info('Adding AI Bot character');
    this.addAiBot();

    // Initialize with idle animation
    setTimeout(() => {
      this.logger.info('Setting initial idle animation');
      this.world.eventBus.emit('animation_state_change', {
        entityId: this.aiBotEntity,
        state: 'idle',
        loop: true
      });
    }, 2000);
  }

  /**
   * Clean up level-specific resources
   */
  protected cleanupLevelSpecifics(): void {
    this.logger.info('Cleaning up CharacterLevel');

    // Remove UI elements
    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
    }
  }

  /**
   * Recreate scene elements after context restoration
   */
  protected recreateSceneAfterContextRestore(): void {
    this.logger.info('Recreating scene after context restoration');

    // Re-setup the level
    this.setupCamera();
    this.setupLighting();
    this.addGroundPlane();
    this.addAiBot();
  }

  /**
   * Add core systems if they don't exist yet
   */
  private addCoreSystems(): void {
    const systems = this.world.getSystems();

    // Scene system must be added first
    if (!systems.some(system => system instanceof SceneSystem)) {
      this.world.addSystem(new SceneSystem());
    }

    // Add window system if needed
    if (!systems.some(system => system instanceof WindowSystem)) {
      this.world.addSystem(new WindowSystem());
    }

    // Add render system if needed
    if (!systems.some(system => system instanceof RenderSystem)) {
      this.world.addSystem(new RenderSystem());
    }
  }

  /**
   * Add model-related systems if they don't exist yet
   */
  private addModelSystems(): void {
    const systems = this.world.getSystems();

    // Add model-related systems
    if (!systems.some(system => system instanceof ModelSystem)) {
      this.world.addSystem(new ModelSystem());
      this.logger.info('Added ModelSystem');
    }

    if (!systems.some(system => system instanceof ModelRegistrationSystem)) {
      this.world.addSystem(new ModelRegistrationSystem());
      this.logger.info('Added ModelRegistrationSystem');
    }

    if (!systems.some(system => system instanceof AnimationControllerSystem)) {
      this.world.addSystem(new AnimationControllerSystem());
      this.logger.info('Added AnimationControllerSystem');
    }
  }

  /**
   * Add character UI system
   */
  private addCharacterUISystem(): void {
    const systems = this.world.getSystems();

    if (!systems.some(system => system instanceof CharacterUISystem)) {
      this.world.addSystem(new CharacterUISystem());
      this.logger.info('Added CharacterUISystem');
    }
  }

  /**
   * Sets up the DOM-based UI
   */
  private setupBackButton(): void {
    this.logger.info('Setting up back button');

    // Ensure container is available
    if (!this.container) {
      this.logger.error('Main container not found!');
      return;
    }

    // Create UI container
    const uiContainer = document.createElement('div');
    uiContainer.className = 'game-ui';
    this.container.appendChild(uiContainer);
    this.uiContainer = uiContainer;

    // Create back button using prefab
    const backButtonPrefab = createBackButtonPrefab({
      onBackClick: () => {
        if (this.levelService) {
          this.logger.info('Back button clicked - returning to menu');
          this.levelService.changeLevel('MAIN_MENU');
        } else {
          this.logger.warn(
            'Cannot navigate to menu - LevelService not available'
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
      this.logger.error('Failed to create back button entity');
      return;
    }

    // Add CSS styles
    this.addStyles();
  }

  /**
   * Adds CSS styles for the UI
   */
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .game-ui {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .back-button:hover {
        background: rgba(0, 0, 0, 0.9) !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
        transform: translateY(-2px) !important;
      }

      .animation-controls {
        position: absolute;
        bottom: 20px;
        left: 20px;
        display: flex;
        gap: 10px;
        z-index: 100;
      }

      .animation-button {
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 8px 16px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .animation-button:hover {
        background: rgba(0, 0, 0, 0.9);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
      }

      .animation-button.active {
        background: rgba(0, 100, 255, 0.7);
        border-color: rgba(100, 200, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Sets up the camera for this level
   */
  private setupCamera(): void {
    this.logger.info('Setting up camera for character viewing');

    // Create basic camera entity
    const cameraEntity = new Entity();

    // Add camera component
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const cameraComponent = new CameraComponent(width, height, 60);
    cameraEntity.addComponent(cameraComponent);

    // Add transform component
    const transform = new TransformComponent();
    transform.setPosition(0, 1.5, 3);
    transform.setRotation(0, 0, 0);
    transform.setScale(1, 1, 1);
    cameraEntity.addComponent(transform);

    // Add orbit control component for user manipulation
    const orbitControl = new OrbitControlComponent(
      new THREE.Vector3(0, 1, 0), // Target
      3.0, // Distance
      {
        minDistance: 1,
        maxDistance: 10,
        rotationSpeed: 1.0,
        zoomSpeed: 1.0,
        enableRotate: true,
        enableZoom: true,
        enablePan: true
      }
    );
    orbitControl.enabled = true;
    cameraEntity.addComponent(orbitControl);

    this.world.addEntity(cameraEntity);
    this.logger.debug('Camera setup complete');
  }

  /**
   * Sets up lighting for the scene
   */
  private setupLighting(): void {
    this.logger.info('Setting up lighting');

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
   * Adds a simple ground plane to the scene
   */
  private addGroundPlane(): void {
    this.logger.info('Adding ground plane');

    // Create a ground plane entity from the registered prefab
    const groundEntity = this.prefabService.createEntityFromPrefab('GroundPlane');

    if (!groundEntity) {
      this.logger.error('Failed to create ground plane entity');
    }
  }

  /**
   * Adds the AI Bot character to the scene
   */
  private addAiBot(): void {
    this.logger.info('Adding AI Bot character');

    // Create the AI Bot prefab
    const aiBotPrefab = createAiBotPrefab({
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      initialAnimation: 'idle',
    });

    // Register the prefab
    prefabRegistry.registerPrefab(aiBotPrefab);

    // Create the entity from the prefab
    const aiBotEntity = this.prefabService.createEntityFromPrefab(aiBotPrefab.name);

    if (!aiBotEntity) {
      this.logger.error('Failed to create AI Bot entity');
      return;
    }

    // Store reference to the entity
    this.aiBotEntity = aiBotEntity;

    this.logger.info('AI Bot character added successfully');
  }

  /**
   * Sets up debug UI
   */
  private setupDebugUI(): void {
    this.logger.info('Setting up debug UI');

    // Add debug UI system if needed
    const systems = this.world.getSystems();
    if (!systems.some(system => system instanceof CoreDebugUISystem)) {
      this.world.addSystem(new CoreDebugUISystem());
    }

    // Create debug UI entity
    const debugUIPrefab = createDebugUIPrefab();
    prefabRegistry.registerPrefab(debugUIPrefab);
    const debugUIEntity = this.prefabService.createEntityFromPrefab(debugUIPrefab.name);

    if (!debugUIEntity) {
      this.logger.error('Failed to create debug UI entity');
    }
  }
}
