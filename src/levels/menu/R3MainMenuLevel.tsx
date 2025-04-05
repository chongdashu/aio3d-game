import { Level } from "aio3d-core";
import {
  World,
  ComponentTypes,
  DOMComponent,
  PrefabService,
  LevelService,
  loggingService,
} from "aio3d-core";
import { createRoot, type Root } from "react-dom/client";
import React from "react";
import {
  Canvas as R3FCanvas,
  ThreeEvent,
  extend,
  type MeshProps,
} from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

// Extend Three.js objects to R3F
extend({ Mesh: THREE.Mesh });

const Canvas = R3FCanvas as unknown as React.FC<{
  children: React.ReactNode;
  camera?: { position: [number, number, number]; fov?: number };
  style?: React.CSSProperties;
}>;

interface ExtendedMesh extends THREE.Mesh {
  onBeforeShadow?: () => void;
  onAfterShadow?: () => void;
}

function MenuItem({
  text,
  position,
  selected,
  onClick,
}: {
  text: string;
  position: [number, number, number];
  selected: boolean;
  onClick: () => void;
}) {
  // Using type assertion to work around type system limitations
  // This is safe because we know the actual runtime type from @react-three/fiber
  const meshRef = React.useRef<THREE.Mesh>(null);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const mesh = meshRef.current;
    if (mesh) {
      // Using setScalar which is definitely available on Vector3
      mesh.scale.setScalar(1.1);
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const mesh = meshRef.current;
    if (mesh) {
      mesh.scale.setScalar(1);
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <mesh
      // @ts-ignore - Type system limitation with @react-three/fiber refs
      ref={meshRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <planeGeometry args={[2, 0.5]} />
      <meshBasicMaterial
        color={selected ? "#88ccff" : "white"}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.2}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </mesh>
  );
}

function MainMenu({
  onStartGame,
  onOptions,
  onQuit,
}: {
  onStartGame: () => void;
  onOptions: () => void;
  onQuit: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const menuItems = React.useMemo(
    () => [
      { text: "Start Game", onClick: onStartGame },
      { text: "Options", onClick: onOptions },
      { text: "Quit", onClick: onQuit },
    ],
    [onStartGame, onOptions, onQuit]
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
          setSelectedIndex(
            (prev) => (prev - 1 + menuItems.length) % menuItems.length
          );
          break;
        case "ArrowDown":
          setSelectedIndex((prev) => (prev + 1) % menuItems.length);
          break;
        case "Enter":
        case "Space":
          menuItems[selectedIndex].onClick();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, menuItems]);

  return (
    <>
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} />
      <group position={[0, 0, 0]}>
        {menuItems.map((item, index) => (
          <MenuItem
            key={item.text}
            text={item.text}
            position={[0, 1 - index * 0.75, 0]}
            selected={index === selectedIndex}
            onClick={item.onClick}
          />
        ))}
      </group>
    </>
  );
}

export class R3MainMenuLevel implements Level {
  private world: World;
  private reactRoot: Root | null = null;
  private levelService: LevelService;
  private container: HTMLElement | null = null;
  private logger = loggingService.createClassLogger(this);

  constructor(
    container: HTMLElement,
    world: World,
    _prefabService: PrefabService,
    levelService: LevelService
  ) {
    this.world = world;
    this.levelService = levelService;
    this.container = container;
    this.logger.info("R3F main menu level initialized");
  }

  private getDOMContainer(): HTMLElement {
    const domEntities = this.world.queryComponents([ComponentTypes.DOM]);
    if (domEntities.length === 0) {
      this.logger.error("No DOM entity found in world");
      throw new Error("No DOM entity found!");
    }
    const domComponent = domEntities[0].getComponent(
      ComponentTypes.DOM
    ) as DOMComponent;
    if (!domComponent.container) {
      this.logger.error("Invalid DOM container in DOM component");
      throw new Error("Invalid DOM container!");
    }
    return domComponent.container;
  }

  public start(): void {
    this.logger.info("Starting R3F main menu level");
    const container = this.getDOMContainer();
    this.container = container;
    this.reactRoot = createRoot(container);

    this.reactRoot.render(
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: "100%", height: "100%", background: "#1a1a2e" }}
      >
        <MainMenu
          onStartGame={() => {
            this.logger.info("Start game clicked, changing to game level");
            this.levelService.changeLevel("GAME");
          }}
          onOptions={() => {
            this.logger.info("Options clicked - not implemented");
          }}
          onQuit={() => {
            this.logger.info("Quit clicked - not implemented");
          }}
        />
      </Canvas>
    );
  }

  public stop(): void {
    this.logger.info("Stopping R3F main menu level");
    // Flag to indicate to R3F that we're cleaning up
    if (this.container) {
      // Add a data attribute to let R3F know we're transitioning
      this.container.setAttribute("data-r3f-transitioning", "true");
      this.logger.debug("Set R3F transitioning flag");
    }
  }

  public cleanup(): void {
    // Enhanced cleanup for better level transitions
    this.logger.info("Performing thorough cleanup of R3F main menu level");

    if (this.reactRoot) {
      // Unmount React component
      this.reactRoot.unmount();
      this.reactRoot = null;
      this.logger.debug("React root unmounted");
    }

    // Clear the container
    if (this.container) {
      // Make sure to remove all canvas elements and event listeners
      const canvases = this.container.querySelectorAll("canvas");
      canvases.forEach((canvas) => {
        // Remove all event listeners by cloning and replacing
        const newCanvas = canvas.cloneNode(false);
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(newCanvas, canvas);
        }
      });

      this.logger.debug(`Cleaned up ${canvases.length} canvas elements`);

      // Clear container contents
      this.container.innerHTML = "";
      this.container.removeAttribute("data-r3f-transitioning");
      this.container = null;

      // Force a small delay before GC
      setTimeout(() => {
        this.logger.debug("R3F main menu cleanup completed");
      }, 0);
    }
  }

  public update(_deltaTime: number): void {
    // R3F handles its own updates
  }
}
