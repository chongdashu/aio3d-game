# AIO3D Game Template

A starter template demonstrating how to build games using the AIO3D Engine. This template provides a complete working example with practical implementations of core engine features.

## Overview

This template implements a simple 3D game environment with multiple levels, a UI system, prefab-based entities, and custom systems. It serves as both a learning resource and a starting point for your own game projects.

## Features

- **Multiple Levels** - Menu and gameplay levels with clean transitions
- **Orbit Camera** - Interactive camera with orbit controls
- **Interactive Objects** - Spinning cube with custom components
- **UI System** - DOM-based UI with menus and in-game controls
- **Prefab System** - Pre-configured entity templates
- **Event System** - Communication between systems
- **WebGL Context Management** - Proper handling of rendering context
- **Physics System** - Realistic physics simulation with collision and sensor detection
  - **Collision Demo** - Physical interactions between dynamic objects with event callbacks
  - **Overlap Sensor Demo** - Demonstrates sensor volumes that detect when objects enter/exit, with visual feedback

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/aio3d-engine.git

# Navigate to the game-template directory
cd aio3d-engine/packages/game-template

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

This will start a development server at http://localhost:5173.

### Building for Production

```bash
# Build for production
npm run build
```

### Development Environment Setup (Working with `aio3d-core`)

This template depends on the local `aio3d-core` package within the monorepo. For development, ensure the following setup:

1.  **Initial Link**: After cloning the main repository and running `npm install` in the root, run `npm run link:setup` **once** from the root directory. This links your local `aio3d-core` build into this package's `node_modules`.
2.  **Core Build Watch**: In a separate terminal, run `npm run watch:core` (or `npm run dev:core`) from the **root directory**. This continuously rebuilds `aio3d-core` as you make changes to its source code, ensuring the linked version used by `game-template` is up-to-date.
3.  **Game Dev Server**: In another terminal, run `npm run dev` from this directory (`packages/game-template`) to start the Vite development server for the game template.

This setup uses `npm link` to resolve the dependency at build/runtime and TypeScript `paths` (`tsconfig.json`) for better IDE integration and faster development builds by pointing directly to the `aio3d-core` source code.

## Project Structure

```
src/
├── components/          # Game-specific components
│   ├── GameComponentTypes.ts  # Component type definitions
│   └── SpinningCubeComponent.ts  # Example custom component
├── factories/           # Component factory registrations
├── levels/              # Level implementations
│   ├── BaseLevel.ts     # Abstract base level
│   ├── SimpleLevel.ts   # Game level with 3D scene
│   └── menu/            # Menu level implementations
├── prefabs/             # Prefab definitions
│   ├── simple/          # Game object prefabs
│   └── ui/              # UI element prefabs
├── systems/             # Game-specific systems
│   ├── SpinningSystem.ts  # System for rotating objects
│   └── ui/              # UI-related systems
├── main.ts              # Entry point and initialization
└── style.css            # Global styles
```

## How to Use This Template

### 1. Initialize the Engine

The entry point `main.ts` initializes the engine with the correct order of operations:

```typescript
// Create core instances
const world = new World();
const factoryRegistry = new ComponentFactoryRegistry();

// Register component factories
registerCoreFactories(factoryRegistry);
registerGameFactories(factoryRegistry);

// Add systems in the correct order
world.addSystem(new SceneSystem());
world.addSystem(new WindowSystem());
world.addSystem(new RenderSystem());
world.addSystem(new InputSystem());

// Create services
const prefabService = new PrefabService(world, factoryRegistry);
const levelService = new LevelService(container, world, prefabService);

// Register and start initial level
levelService.changeLevel("MAIN_MENU");
```

### 2. Creating Components

Add new game-specific components:

```typescript
// 1. Define component type in GameComponentTypes.ts
export const GameComponentTypes = {
  SPINNING_CUBE: Symbol.for("game.spinning-cube"),
  // Add your new component type:
  PLAYER: Symbol.for("game.player"),
} as const;

// 2. Create component class
export class PlayerComponent extends Component {
  public readonly type = GameComponentTypes.PLAYER;
  public health: number;
  public speed: number;

  constructor(data?: { health?: number; speed?: number }) {
    super();
    this.health = data?.health ?? 100;
    this.speed = data?.speed ?? 5;
  }

  public validate(): void {
    // Enforce constraints
    this.health = Math.max(0, Math.min(100, this.health));
    this.speed = Math.max(1, Math.min(10, this.speed));
  }
}

// 3. Register factory in factories.ts
factoryRegistry.registerFactory(GameComponentTypes.PLAYER, (data?: any) => {
  const component = new PlayerComponent(data);
  component.validate();
  return component;
});
```

### 3. Creating Systems

Add new game-specific systems:

```typescript
export class PlayerSystem extends System {
  public initialize(world: World): void {
    this.world = world;
    // Set up event listeners
    this.world.eventBus.on("player_damage", this.handleDamage.bind(this));
  }

  public update(world: World, deltaTime: number): void {
    const players = world.queryComponents([
      GameComponentTypes.PLAYER,
      CoreComponentTypes.TRANSFORM,
    ]);

    for (const entity of players) {
      const player = entity.getComponent<PlayerComponent>(
        GameComponentTypes.PLAYER
      );
      const transform = entity.getComponent<TransformComponent>(
        CoreComponentTypes.TRANSFORM
      );

      if (!player || !transform) continue;

      // Handle player movement
      // ...
    }
  }

  private handleDamage(data: { entityId: number; amount: number }): void {
    const entity = this.world?.getEntity(data.entityId);
    if (!entity) return;

    const player = entity.getComponent<PlayerComponent>(
      GameComponentTypes.PLAYER
    );
    if (!player) return;

    player.health -= data.amount;
    player.validate();

    if (player.health <= 0) {
      this.world?.eventBus.emit("player_died", { entityId: entity.id });
    }
  }

  public cleanup(): void {
    if (this.world?.eventBus) {
      this.world.eventBus.off("player_damage", this.handleDamage.bind(this));
    }
    this.world = null;
  }
}
```

### 4. Creating Prefabs

Define reusable entity templates:

```typescript
// Create a prefab factory function for flexibility
export const createPlayerPrefab = (config: {
  position?: THREE.Vector3;
  health?: number;
  speed?: number;
}): Prefab => {
  return {
    name: "Player",
    components: [
      {
        type: CoreComponentTypes.TRANSFORM,
        data: {
          position: config.position ?? new THREE.Vector3(0, 1, 0),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
        },
      },
      {
        type: CoreComponentTypes.MESH,
        data: {
          geometryType: "CapsuleGeometry",
          geometryArgs: [0.5, 1.5, 4, 8],
          materialType: "MeshStandardMaterial",
          materialArgs: { color: 0x3080ff },
        },
      },
      {
        type: GameComponentTypes.PLAYER,
        data: {
          health: config.health ?? 100,
          speed: config.speed ?? 5,
        },
      },
    ],
  };
};

// Register and create
prefabRegistry.registerPrefab(
  createPlayerPrefab({ position: new THREE.Vector3(0, 1, 0) })
);
const playerEntity = prefabService.createEntityFromPrefab("Player");
world.addEntity(playerEntity);
```

### 5. Implementing Levels

Create custom game levels by extending BaseLevel:

```typescript
export class GameLevel extends BaseLevel {
  protected setupLevel(): void {
    // Set up in this specific order
    this.setupCamera();
    this.setupLighting();
    this.addGameObjects();
    this.setupUI();

    // Start game-specific logic
    this.startGameLoop();
  }

  private setupCamera(): void {
    // Create camera with orbit controls
    const cameraPrefab = createOrbitCameraPrefab({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      target: new THREE.Vector3(0, 1, 0),
      distance: 10,
    });

    prefabRegistry.registerPrefab(cameraPrefab);
    const cameraEntity = this.prefabService.createEntityFromPrefab(
      cameraPrefab.name
    );
  }

  private addGameObjects(): void {
    // Add player
    const playerPrefab = createPlayerPrefab({
      position: new THREE.Vector3(0, 1, 0),
    });

    prefabRegistry.registerPrefab(playerPrefab);
    const playerEntity = this.prefabService.createEntityFromPrefab(
      playerPrefab.name
    );
  }

  protected cleanupLevelSpecifics(): void {
    // Clean up level-specific resources
  }
}
```

## Working with the Engine

### WebGL Context Management

The template demonstrates proper handling of WebGL context:

```typescript
// Check renderer state before operations
if (this.sceneSystem.isRendererReady()) {
  // Perform rendering operations
}

// Handle context loss/restoration
protected recreateSceneAfterContextRestore(): void {
  this.setupCamera();
  this.setupLighting();
}
```

### UI Integration

The template shows how to create and manage UI elements:

```typescript
private setupUI(): void {
  // Create UI container
  this.uiContainer = document.createElement("div");
  this.uiContainer.className = "game-ui";
  this.container.appendChild(this.uiContainer);

  // Create back button using prefab
  const backButtonPrefab = createBackButtonPrefab({
    onBackClick: () => {
      this.levelService.changeLevel("MAIN_MENU");
    },
  });

  prefabRegistry.registerPrefab(backButtonPrefab);
  const backButtonEntity = this.prefabService.createEntityFromPrefab(backButtonPrefab.name);
}
```

### Physics Integration

The template includes examples of physics integration using the Rapier physics engine:

#### Creating Physics Objects

```typescript
// Create a dynamic physics box
const box = new Entity();
const transform = new TransformComponent();
transform.position.set(0, 5, 0);
box.addComponent(ComponentTypes.TRANSFORM, transform);

// Add rigid body component
box.addComponent(ComponentTypes.RIGID_BODY, {
  bodyType: "dynamic",
  mass: 1,
  gravityScale: 1.5,
  linearDamping: 0.01,
  angularDamping: 0.05,
});

// Add collider component
box.addComponent(ComponentTypes.COLLIDER, {
  shape: "box",
  size: [1, 1, 1],
  restitution: 0.3,
  friction: 0.8,
});

// Add visual representation
const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const boxMat = new THREE.MeshStandardMaterial({ color: 0xff6347 });
const meshComp = new MeshComponent(boxGeom, boxMat);
box.addComponent(ComponentTypes.MESH, meshComp);

world.addEntity(box);
```

#### Creating Sensor Volumes

```typescript
// Create a sensor volume for detecting overlaps
const sensor = new Entity();
const sensorTransform = new TransformComponent();
sensorTransform.position.set(0, 2, 0);
sensor.addComponent(ComponentTypes.TRANSFORM, sensorTransform);
sensor.addComponent(ComponentTypes.RIGID_BODY, { bodyType: "static" });

// Create a sensor collider (isSensor: true is the key)
sensor.addComponent(ComponentTypes.COLLIDER, {
  shape: "box",
  size: [3, 2, 3],
  isSensor: true,
});

// Add visual representation
const sensorGeom = new THREE.BoxGeometry(3, 2, 3);
const sensorMat = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.5,
});
sensor.addComponent(
  ComponentTypes.MESH,
  new MeshComponent(sensorGeom, sensorMat)
);

world.addEntity(sensor);
```

#### Handling Physics Events

```typescript
// Listen for collision events
world.eventBus.on(PhysicsEvents.COLLISION_START, (evt) => {
  console.log(
    `Collision started between entities ${evt.bodyA} and ${evt.bodyB}`
  );

  // Change color of objects when they collide
  const entity = world.getEntity(evt.bodyA);
  if (entity) {
    const meshComp = entity.getComponent(ComponentTypes.MESH);
    if (meshComp?.mesh?.material) {
      (meshComp.mesh.material as THREE.MeshStandardMaterial).color.set(
        0xff0000
      );
    }
  }
});

// Listen for collision end events
world.eventBus.on(PhysicsEvents.COLLISION_END, (evt) => {
  console.log(`Collision ended between entities ${evt.bodyA} and ${evt.bodyB}`);
});

// Apply physics impulses
world.eventBus.emit(PhysicsEvents.APPLY_IMPULSE, {
  entityId: boxEntity.id,
  impulse: { x: 0, y: -5, z: 0 },
});
```

### Event Communication

Use the event system for communication between systems:

```typescript
// Emit events
world.eventBus.emit("player_damage", { entityId: player.id, amount: 10 });

// Listen for events
world.eventBus.on("player_died", (data) => {
  console.log(`Player ${data.entityId} died!`);
  // Show game over screen
});
```

## Troubleshooting

- **Black screen after level transition**: Check for WebGL context issues and ensure proper cleanup
- **Missing objects**: Verify prefab registration and component factory setup
- **Performance issues**: Use debug UI to monitor framerate and optimize rendering

## License

MIT
