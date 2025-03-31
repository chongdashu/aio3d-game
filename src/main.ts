import "./style.css";
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
  // Note: prefabRegistry is imported by SpinningCubePrefab
} from "aio3d-core";

// Import game-specific setup
import { registerGameFactories } from "./factories";
import { MeshRegistrationSystem } from "./systems/MeshRegistrationSystem";
import { SpinningSystem } from "./systems/SpinningSystem";

// Import prefab definitions to trigger registration (side effect)
import "./prefabs/SpinningCubePrefab";
import "./prefabs/GroundPlanePrefab";
// Import other prefabs here...

// Get the container element
const container = document.getElementById("app");

if (!container) {
  throw new Error("Container element not found");
}

// --- Setup Core ECS and Services ---

// 1. Create World
const world = new World();

// ** Create DOM Entity **
// Systems like SceneSystem, WindowSystem need a DOM entity present at initialization
const domEntity = new Entity();
domEntity.addComponent(ComponentTypes.DOM, new DOMComponent(container));
world.addEntity(domEntity);

// 2. Create Component Factory Registry
const factoryRegistry = new ComponentFactoryRegistry();

// 3. Register Game Component Factories
registerGameFactories(factoryRegistry);

// 4. Add Core Systems (Order might matter! Scene and Window needed before Render)
world.addSystem(new SceneSystem());
world.addSystem(new WindowSystem()); // Needed for camera/renderer resizing
world.addSystem(new RenderSystem()); // Renders the scene

// 5. Add Game-Specific Systems (including listeners)
// MeshRegistrationSystem depends on SceneSystem, so add it after.
world.addSystem(new MeshRegistrationSystem());
world.addSystem(new SpinningSystem());

// 6. Prefab definitions are registered via imports above

// 7. Create Prefab Service
const prefabService = new PrefabService(world, factoryRegistry);

// --- Initialize Level/Scene ---

// Import the SimpleLevel (assuming its constructor is updated)
import { SimpleLevel } from "./levels/SimpleLevel";

// 8. Create and start the scene, passing dependencies
// The SimpleLevel constructor will need to be updated to accept world and prefabService
const level = new SimpleLevel(container, world, prefabService);
level.start();

// Expose core elements to window for debugging
(window as any).gameWorld = world;
(window as any).prefabService = prefabService;
(window as any).currentLevel = level;
