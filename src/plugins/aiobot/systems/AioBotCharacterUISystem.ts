import GUI from "lil-gui";
import * as THREE from "three";
import {
  System,
  World,
  ComponentTypes,
  ModelComponent,
  AnimationControllerComponent,
  TransformComponent,
  loggingService
} from "aio3d-core";

/**
 * UI system for debugging and controlling character models and animations.
 * Provides controls for animation playback, model positioning, and other parameters.
 */
export class CharacterUISystem extends System {
  protected world: World | null = null;
  private logger = loggingService.createClassLogger(this);
  private gui: GUI | null = null;
  private characterFolder: GUI | null = null;
  private characterControllers: Map<number, GUI> = new Map();
  private initialized: boolean = false;

  // Animation controls state
  private animationSpeed: number = 1.0;
  private currentAnimationState: string = "idle";
  private loopAnimation: boolean = true;
  private animationControls = {
    animationSpeed: 1.0,
    loopAnimation: true
  };

  /**
   * Initialize the character UI system
   * @param world - The game world instance
   */
  public initialize(world: World): void {
    this.world = world;
    this.logger.info("Initializing CharacterUISystem");
    this.setupGUI();
    this.initialized = true;
    this.logger.info("CharacterUISystem initialized successfully");

    // Listen for model loaded events to add new model controls
    this.world.eventBus.on("model_ready", this.handleModelReady.bind(this));
  }

  /**
   * Update character UI values
   * @param world - The game world instance
   * @param deltaTime - Time elapsed since last update
   */
  public update(world: World, deltaTime: number): void {
    if (!this.initialized) {
      this.logger.warn("CharacterUISystem not properly initialized");
      return;
    }

    if (!this.gui) {
      this.logger.warn("GUI not created, attempting to recreate");
      this.setupGUI();
      return;
    }

    // Find all character entities with animation controllers
    const characterEntities = world.queryComponents([
      ComponentTypes.MODEL,
      ComponentTypes.ANIMATION_CONTROLLER,
      ComponentTypes.TRANSFORM
    ]);

    if (characterEntities.length === 0) {
      // No need to log every frame
      return;
    }

    // Update or create controllers for each character
    for (const entity of characterEntities) {
      const model = entity.getComponent<ModelComponent>(
        ComponentTypes.MODEL
      );
      const animController = entity.getComponent<AnimationControllerComponent>(
        ComponentTypes.ANIMATION_CONTROLLER
      );
      const transform = entity.getComponent<TransformComponent>(
        ComponentTypes.TRANSFORM
      );

      if (!model || !animController || !transform) {
        continue;
      }

      // Check if we already have a controller for this entity
      if (!this.characterControllers.has(entity.id)) {
        this.createCharacterController(entity.id, model, animController, transform);
      }

      // Update existing controllers if needed
      this.updateControllerValues(entity.id, model, animController, transform);
    }

    // Remove controllers for characters that no longer exist
    for (const [entityId, charGui] of this.characterControllers) {
      const entity = world.getEntity(entityId);
      if (!entity || !entity.hasComponent(ComponentTypes.MODEL)) {
        charGui.destroy();
        this.characterControllers.delete(entityId);
      }
    }
  }

  /**
   * Handle model ready event to add controls for new models
   */
  private handleModelReady(data: { entityId: number }): void {
    if (!this.world) return;
    
    const entity = this.world.getEntity(data.entityId);
    if (!entity) return;
    
    if (entity.hasComponent(ComponentTypes.MODEL) && 
        entity.hasComponent(ComponentTypes.ANIMATION_CONTROLLER) &&
        entity.hasComponent(ComponentTypes.TRANSFORM)) {
      
      const model = entity.getComponent<ModelComponent>(ComponentTypes.MODEL);
      const animController = entity.getComponent<AnimationControllerComponent>(ComponentTypes.ANIMATION_CONTROLLER);
      const transform = entity.getComponent<TransformComponent>(ComponentTypes.TRANSFORM);
      
      if (model && animController && transform) {
        this.createCharacterController(entity.id, model, animController, transform);
      }
    }
  }

  /**
   * Clean up GUI resources
   */
  public cleanup(): void {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
    
    this.characterFolder = null;
    this.characterControllers.clear();
    this.initialized = false;
    
    // Unsubscribe from events
    if (this.world) {
      this.world.eventBus.off("model_ready", this.handleModelReady.bind(this));
    }
    
    this.logger.info("Character UI cleaned up");
  }

  /**
   * Set up the lil-gui instance
   */
  private setupGUI(): void {
    if (this.gui) {
      this.logger.warn("GUI already exists, cleaning up first");
      this.cleanup();
    }

    try {
      this.gui = new GUI({
        title: "Character Debug Panel",
        width: 350, // Make the panel wider for better readability
      });
      this.logger.info("Character UI panel created successfully");
    } catch (error) {
      this.logger.error("Failed to create GUI:", error);
      this.gui = null;
    }
  }

  /**
   * Create UI controls for a character entity
   */
  private createCharacterController(
    entityId: number,
    model: ModelComponent,
    animController: AnimationControllerComponent,
    transform: TransformComponent
  ): void {
    if (!this.gui) return;

    // Check if we already have a controller for this model URL to avoid duplicates
    const modelUrl = model.modelUrl || '';
    const existingControllers = Array.from(this.characterControllers.values());
    for (const controller of existingControllers) {
      // @ts-ignore - We're adding a custom property to the GUI
      if (controller.modelUrl === modelUrl) {
        this.logger.debug('Controller for this model URL already exists', { modelUrl });
        return;
      }
    }

    // Create the character folder if it doesn't exist
    if (!this.characterFolder) {
      this.characterFolder = this.gui.addFolder("Characters");
      this.characterFolder.open();
    }

    // Create a folder for this character
    const characterName = model.modelUrl?.split("/").pop()?.split(".")[0] || `Character ${entityId}`;
    const charGui = this.characterFolder.addFolder(characterName);
    // @ts-ignore - Store model URL as a custom property on the GUI for future reference
    charGui.modelUrl = modelUrl;
    charGui.open();

    // Animation controls
    const animFolder = charGui.addFolder("Animation");
    
    // Collect all available animation states
    const states = Array.from(animController.states.keys());
    
    // Animation state selection
    if (states.length > 0) {
      this.currentAnimationState = states[0];
      const stateController = animFolder.add({ state: this.currentAnimationState }, 'state', states)
        .name('Animation State')
        .onChange((state: string) => {
          if (this.world) {
            this.currentAnimationState = state;
            this.world.eventBus.emit('animation_state_change', {
              entityId,
              state,
              loop: this.loopAnimation
            });
          }
        });
    }
    
    // Loop animation toggle
    animFolder.add(this.animationControls, 'loopAnimation')
      .name('Loop Animation')
      .onChange((loop: boolean) => {
        if (this.world) {
          this.loopAnimation = loop;
          this.world.eventBus.emit('animation_state_change', {
            entityId,
            state: this.currentAnimationState,
            loop
          });
        }
      });
    
    // Animation speed control
    animFolder.add(this.animationControls, 'animationSpeed', 0.1, 2.0)
      .name('Animation Speed')
      .onChange((speed: number) => {
        this.animationSpeed = speed;
        if (model.mixer) {
          model.mixer.timeScale = speed;
        }
      });

    // Play button
    animFolder.add({ playAnimation: () => {
      if (this.world) {
        this.world.eventBus.emit('animation_state_change', {
          entityId,
          state: this.currentAnimationState,
          loop: this.loopAnimation
        });
      }
    }}, 'playAnimation').name('Play Animation');
    
    animFolder.open();

    // Transform controls
    const transformFolder = charGui.addFolder("Transform");
    
    // Position
    const posFolder = transformFolder.addFolder("Position");
    posFolder.add(transform.position, 'x', -10, 10).step(0.1).listen();
    posFolder.add(transform.position, 'y', -10, 10).step(0.1).listen();
    posFolder.add(transform.position, 'z', -10, 10).step(0.1).listen();
    posFolder.open();
    
    // Rotation (in degrees for easier editing)
    const rotFolder = transformFolder.addFolder("Rotation");
    
    // Create a proxy object that converts between radians and degrees
    const rotationDegrees = {
      x: THREE.MathUtils.radToDeg(transform.rotation.x),
      y: THREE.MathUtils.radToDeg(transform.rotation.y),
      z: THREE.MathUtils.radToDeg(transform.rotation.z)
    };
    
    rotFolder.add(rotationDegrees, 'x', -180, 180).step(1)
      .name('X (degrees)')
      .onChange((value: number) => {
        transform.rotation.x = THREE.MathUtils.degToRad(value);
      });
    
    rotFolder.add(rotationDegrees, 'y', -180, 180).step(1)
      .name('Y (degrees)')
      .onChange((value: number) => {
        transform.rotation.y = THREE.MathUtils.degToRad(value);
      });
    
    rotFolder.add(rotationDegrees, 'z', -180, 180).step(1)
      .name('Z (degrees)')
      .onChange((value: number) => {
        transform.rotation.z = THREE.MathUtils.degToRad(value);
      });
    
    rotFolder.open();
    
    // Scale
    const scaleFolder = transformFolder.addFolder("Scale");
    scaleFolder.add(transform.scale, 'x', 0.1, 5).step(0.1).listen();
    scaleFolder.add(transform.scale, 'y', 0.1, 5).step(0.1).listen();
    scaleFolder.add(transform.scale, 'z', 0.1, 5).step(0.1).listen();
    scaleFolder.open();
    
    transformFolder.open();

    // Model info
    const infoFolder = charGui.addFolder("Model Info");
    if (model.model) {
      infoFolder.add({ isModelLoaded: model.model !== null }, 'isModelLoaded')
        .name('Model Loaded')
        .listen()
        .disable();
      
      const animCount = model.animations ? model.animations.length : 0;
      infoFolder.add({ animationCount: animCount }, 'animationCount')
        .name('Animation Count')
        .listen()
        .disable();
        
      if (model.animations && model.animations.length > 0) {
        const animNames = model.animations.map(a => a.name).join(', ');
        infoFolder.add({ animationNames: animNames }, 'animationNames')
          .name('Animation Names')
          .listen()
          .disable();
      }
      
      // Add model URL
      infoFolder.add({ modelUrl: model.modelUrl || 'Unknown' }, 'modelUrl')
        .name('Model URL')
        .listen()
        .disable();
    }
    infoFolder.open();
    
    // Save this controller
    this.characterControllers.set(entityId, charGui);
  }

  /**
   * Update controller values (for dynamic values that need to be kept in sync)
   */
  private updateControllerValues(
    entityId: number,
    model: ModelComponent,
    animController: AnimationControllerComponent,
    transform: TransformComponent
  ): void {
    // Update any dynamic values that need to stay in sync
    // This is called every frame for controllers that already exist
    
    // Most values will auto-update because we use .listen() on the controls
    // This method is for any special cases where we need custom updates
  }
}
