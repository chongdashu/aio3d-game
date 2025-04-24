import "./style.css";
import type { Level } from "aio3d-core";
import {
  World,
  ComponentFactoryRegistry,
  PrefabService,
  SceneSystem,
  RenderSystem,
  WindowSystem,
  Entity,
  DOMComponent,
  ComponentTypes,
  registerCoreFactories,
  InputSystem,
  UINavigationSystem,
  // Level Management
  LevelService,
  LevelRegistry,
  // Note: prefabRegistry is imported by SpinningCubePrefab
  PersistentComponent,
  // Add logging imports
  loggingService,
  LogLevel,
  DOMUISystem,
  ContainerComponent,
  OrbitCameraSystem,
  PhysicsSystem, // Import PhysicsSystem
  // Plugin System
  registerPlugin,
  RapierService, // Import RapierService
} from "aio3d-core";

// Import game-specific setup
import { registerGameFactories } from "./factories";
import { GameMeshRegistrationSystem } from "./systems/GameMeshRegistrationSystem";
import { SpinningSystem } from "./systems/simple/SpinningSystem";
import { GameUIRegistrationSystem } from "./systems/ui/ThreeJsMenuUIRegistrationSystem";

// Import plugin system
import { AIOBotPlugin } from "./plugins/aiobot";

// Import all prefab definitions to trigger registration
import "./prefabs";

// Import Level implementations
import { SimpleLevel } from "./levels/examples/simple/SimpleLevel";
import { MainMenuLevel } from "./levels/MainMenuLevel";
import { ThreeJsMainMenu } from "./levels/examples/menu/ThreeJsMainMenuLevel";
import { R3FMainMenuLevel } from "./levels/examples/menu/R3FMainMenuLevel";
// Import AIOBot level from plugin instead
import { AioBotCharacterLevel } from "./plugins/aiobot/levels/AioBotCharacterLevel";
import PhysicsCollisionLevel from "@/levels/examples/PhysicsCollisionLevel";
import PhysicsOverlapLevel from "@/levels/examples/PhysicsOverlapLevel";

// Create logger for main
const logger = loggingService.createLogger("Main");

// Set log level based on environment
if (process.env.NODE_ENV === "development") {
  loggingService.setGlobalLevel(LogLevel.DEBUG);
}

// Initialize the game asynchronously
async function initGame() {
  // Get the container element
  const container = document.getElementById("app");

  if (!container) {
    logger.error("Container element not found");
    throw new Error("Container element not found");
  }

  logger.info("Container found", container);

  // --- Setup Core ECS and Services ---

  // 1. Create World
  logger.info("Creating World");
  const world = new World();

  // 2. Create Component Factory Registry
  logger.debug("Creating ComponentFactoryRegistry");
  const factoryRegistry = new ComponentFactoryRegistry();

  // 3. Register Core Component Factories
  logger.debug("Registering core component factories");
  registerCoreFactories(factoryRegistry);

  // 4. Register Game Component Factories
  logger.debug("Registering game component factories");
  registerGameFactories(factoryRegistry);

  // Create container entity first
  logger.debug("Creating container entity");
  const containerEntity = new Entity();
  containerEntity.addComponent(ComponentTypes.DOM, new DOMComponent(container));
  containerEntity.addComponent(
    ComponentTypes.CONTAINER,
    new ContainerComponent(container)
  );
  containerEntity.addComponent(
    ComponentTypes.PERSISTENT,
    new PersistentComponent()
  );
  world.addEntity(containerEntity);

  // 5. Add Core Systems (Order might matter! Scene and Window needed before Render)
  logger.info("Adding core systems");
  world.addSystem(new SceneSystem());
  world.addSystem(new WindowSystem());
  world.addSystem(new RenderSystem());
  world.addSystem(new DOMUISystem());

  // Add input systems - order matters! InputSystem should come before UINavigationSystem
  logger.info("Adding input systems");
  world.addSystem(new InputSystem());
  world.addSystem(new UINavigationSystem());

  // Initialize Rapier physics before adding PhysicsSystem
  logger.info("Initializing physics engine (Rapier)");
  await RapierService.getInstance(); // Make sure Rapier is initialized

  // Now add PhysicsSystem after Rapier is initialized
  logger.info("Adding physics system");
  const physicsSystem = new PhysicsSystem();
  world.addSystem(physicsSystem);
  await physicsSystem.initialize(world); // Properly await the physics system initialization

  world.addSystem(new OrbitCameraSystem()); // Add orbit camera after input system

  // 6. Add Game-Specific Systems (including listeners)
  // MeshRegistrationSystem depends on SceneSystem, so add it after.
  logger.info("Adding game-specific systems");
  world.addSystem(new SpinningSystem());
  world.addSystem(new GameMeshRegistrationSystem());
  world.addSystem(new GameUIRegistrationSystem());

  // 7. Register plugins
  logger.info("Registering plugins");
  registerPlugin(world, new AIOBotPlugin());

  // 8. Prefab definitions are registered via imports above
  logger.debug("Prefab definitions registered");

  // 9. Create Prefab Service
  logger.debug("Creating PrefabService");
  const prefabService = new PrefabService(world, factoryRegistry);

  // 10. Create LevelService
  logger.debug("Creating LevelService");
  const levelService = new LevelService(container, world, prefabService);

  // 11. Get LevelRegistry and register level factories
  logger.info("Registering level factories");
  const registry = LevelRegistry.getInstance();

  // Register level factories
  registry.registerLevel(
    "MAIN_MENU",
    (
      container: HTMLElement,
      world: World,
      prefabService: PrefabService,
      levelService: LevelService
    ): Level => {
      return new MainMenuLevel(container, world, prefabService, levelService);
    }
  );

  registry.registerLevel(
    "R3_MENU",
    (
      container: HTMLElement,
      world: World,
      prefabService: PrefabService,
      levelService: LevelService
    ): Level => {
      return new R3FMainMenuLevel(
        container,
        world,
        prefabService,
        levelService
      );
    }
  );

  registry.registerLevel(
    "GAME",
    (
      container: HTMLElement,
      world: World,
      prefabService: PrefabService,
      levelService: LevelService
    ): Level => {
      return new SimpleLevel(container, world, prefabService, levelService);
    }
  );

  // Register test level
  registry.registerLevel(
    "MENU_TEST",
    (
      container: HTMLElement,
      world: World,
      prefabService: PrefabService,
      levelService: LevelService
    ): Level => {
      return new ThreeJsMainMenu(container, world, prefabService, levelService);
    }
  );

  registry.registerLevel(
    "CHARACTER_LEVEL",
    (container, world, prefabService, levelService) =>
      new AioBotCharacterLevel(container, world, prefabService, levelService)
  );

  registry.registerLevel(
    "PHYSICS_COLLISION",
    (container, world, prefabService, levelService): Level =>
      new PhysicsCollisionLevel(container, world, prefabService, levelService)
  );

  registry.registerLevel(
    "PHYSICS_OVERLAP",
    (container, world, prefabService, levelService): Level =>
      new PhysicsOverlapLevel(container, world, prefabService, levelService)
  );

  registry.registerLevel(
    "SimpleLevel",
    (container, world, prefabService, levelService): Level =>
      new SimpleLevel(container, world, prefabService, levelService)
  );

  registry.registerLevel(
    "PhysicsCollisionLevel",
    (container, world, prefabService, levelService): Level =>
      new PhysicsCollisionLevel(container, world, prefabService, levelService)
  );

  registry.registerLevel(
    "PhysicsOverlapLevel",
    (container, world, prefabService, levelService): Level =>
      new PhysicsOverlapLevel(container, world, prefabService, levelService)
  );

  // 12. Start with the R3 menu
  levelService.changeLevel("MAIN_MENU");

  // Expose core elements to window for debugging
  logger.debug("Exposing debug objects to window");
  (window as any).gameWorld = world;
  (window as any).prefabService = prefabService;
  (window as any).levelService = levelService;
  (window as any).loggingService = loggingService; // Add logging service to window for runtime configuration

  logger.info("Initialization complete");
}

// Start the game
initGame().catch((error) => {
  logger.error("Failed to initialize game:", error);
});
