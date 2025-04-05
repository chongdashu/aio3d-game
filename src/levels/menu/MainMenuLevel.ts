import type { Level } from "aio3d-core";
import {
  World,
  Entity,
  ComponentTypes,
  PrefabService,
  LevelService,
  SelectableComponent,
  loggingService,
} from "aio3d-core";
import { BaseLevel } from "../BaseLevel";

/**
 * Handles the main menu screen of the game using DOM-based UI
 */
export class MainMenuLevel extends BaseLevel {
  private menuContainer: HTMLElement | null = null;
  private menuEntities: Entity[] = [];

  /**
   * Creates a new MainMenuLevel
   * @param container - The container element to render to
   * @param world - The ECS world instance
   * @param prefabService - The service for creating entities from prefabs
   * @param levelService - The level service for level transitions
   */
  constructor(
    container: HTMLElement,
    world: World,
    prefabService: PrefabService,
    levelService: LevelService
  ) {
    super(container, world, prefabService, levelService);
    this.logger.info("Main menu level initialized");
  }

  /**
   * Sets up all level-specific elements
   */
  protected setupLevel(): void {
    this.setupMenu();
  }

  /**
   * Clean up level-specific resources
   */
  protected cleanupLevelSpecifics(): void {
    // Remove event listeners
    this.world.eventBus.off(
      "ui_selection_changed",
      this.handleSelectionChanged.bind(this)
    );

    // Remove menu entities
    for (const entity of this.menuEntities) {
      this.world.removeEntity(entity.id);
    }
    this.menuEntities = [];

    // Remove the menu container from the DOM
    if (this.menuContainer && this.container.contains(this.menuContainer)) {
      this.container.removeChild(this.menuContainer);
      this.menuContainer = null;
    }
  }

  /**
   * Recreate scene after WebGL context is restored
   */
  protected recreateSceneAfterContextRestore(): void {
    // No 3D scene to recreate in the menu
  }

  /**
   * Sets up the DOM UI menu
   */
  private setupMenu(): void {
    this.logger.info("Setting up DOM menu UI");

    // Ensure container is available
    if (!this.container) {
      this.logger.error("Main container not found!");
      return;
    }

    // Create menu container
    const menuContainer = document.createElement("div");
    menuContainer.className = "game-main-menu";
    this.container.appendChild(menuContainer);
    this.menuContainer = menuContainer;

    // Create title
    const title = document.createElement("h1");
    title.className = "game-title";
    title.textContent = "AIO3D Game";
    menuContainer.appendChild(title);

    // Create subtitle
    const subtitle = document.createElement("p");
    subtitle.className = "game-subtitle";
    subtitle.textContent = "Welcome to your next adventure";
    menuContainer.appendChild(subtitle);

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "menu-buttons";
    menuContainer.appendChild(buttonContainer);

    // Create menu buttons if buttonContainer exists
    if (buttonContainer) {
      this.createMenuButton(
        "Start Game",
        0,
        () => {
          this.logger.info("Start Game button clicked, changing to game level");
          this.levelService.changeLevel("GAME");
        },
        buttonContainer
      );

      this.createMenuButton(
        "Character Demo",
        1,
        () => {
          this.logger.info("Character Demo button clicked, changing to character level");
          this.levelService.changeLevel("CHARACTER_LEVEL");
        },
        buttonContainer
      );

      this.createMenuButton(
        "Options",
        2,
        () => {
          this.logger.info("Options button clicked - not implemented");
        },
        buttonContainer
      );

      this.createMenuButton(
        "Credits",
        3,
        () => {
          this.logger.info("Credits button clicked - not implemented");
        },
        buttonContainer
      );
    }

    // Add event listeners for selection changes
    const buttonElements = buttonContainer.children;
    for (const button of buttonElements) {
      if (button) {
        button.addEventListener("click", () => {
          this.logger.info("Button clicked");
        });
      }
    }

    this.world.eventBus.on(
      "ui_selection_changed",
      this.handleSelectionChanged.bind(this)
    );

    // Add CSS styles
    this.addStyles();
  }

  /**
   * Creates a menu button with an associated entity for selection
   * @param text - Button text
   * @param index - Navigation index
   * @param onClick - Click handler
   * @param parent - Parent element to append the button to
   */
  private createMenuButton(
    text: string,
    index: number,
    onClick: () => void,
    parent: HTMLElement
  ): void {
    // Create the button element
    const button = document.createElement("button");
    button.className = "menu-button";
    button.dataset.index = index.toString();
    button.textContent = text;
    if (button) {
      button.addEventListener("click", onClick);
    }
    parent.appendChild(button);

    // Create an entity for this button
    const menuEntity = new Entity();

    // Add a selectable component
    const selectable = new SelectableComponent({
      navigationIndex: index,
      onActivate: onClick,
      groupId: "main-menu",
    });
    menuEntity.addComponent(ComponentTypes.SELECTABLE, selectable);

    // Store reference to DOM element
    (menuEntity as any).domElement = button;

    // Add hover event to emit ui_mouse_hover event
    if (button) {
      button.addEventListener("mouseenter", () => {
        this.world.eventBus.emit("ui_mouse_hover", { entityId: menuEntity.id });
      });
    }

    // Add entity to world and store reference
    this.world.addEntity(menuEntity);
    this.menuEntities.push(menuEntity);
  }

  /**
   * Handle selection changes from the UINavigationSystem
   * @param data - Selection event data
   */
  private handleSelectionChanged(data: {
    entityId: number;
    groupId: string;
  }): void {
    if (data.groupId !== "main-menu") return;

    this.logger.debug("Menu selection changed", {
      entityId: data.entityId,
      groupId: data.groupId,
    });

    // Update visual state of all buttons
    for (const entity of this.menuEntities) {
      const button = (entity as any).domElement;
      if (!button) continue;

      const selectable = entity.getComponent<SelectableComponent>(
        ComponentTypes.SELECTABLE
      );

      if (entity.id === data.entityId && selectable && selectable.isSelected) {
        button.classList.add("selected");
        this.logger.debug("Selected menu item", {
          entityId: entity.id,
          buttonText: button.textContent,
        });
      } else {
        button.classList.remove("selected");
      }
    }
  }

  /**
   * Adds CSS styles to the document
   */
  private addStyles(): void {
    const style = document.createElement("style");
    style.textContent = `
      .game-main-menu {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        overflow: hidden;
      }

      .game-main-menu::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
        background-size: 25px 25px;
        z-index: 1;
        opacity: 0.3;
      }

      .game-title {
        font-size: 3.5rem;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 3px;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        animation: glow 2s ease-in-out infinite alternate;
        z-index: 2;
      }

      .game-subtitle {
        font-size: 1.2rem;
        margin: 1rem 0 3rem 0;
        opacity: 0.8;
        z-index: 2;
      }

      .menu-buttons {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        z-index: 2;
        width: 250px;
      }

      .menu-button {
        background: transparent;
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.8rem 1.5rem;
        font-size: 1.1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
        position: relative;
        overflow: hidden;
      }

      .menu-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: all 0.4s ease;
      }

      .menu-button:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }

      .menu-button:hover::before {
        left: 100%;
      }

      .menu-button:active {
        transform: translateY(0);
      }

      .menu-button.selected {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.8);
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }

      @keyframes glow {
        from {
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.5), 0 0 10px rgba(255, 255, 255, 0.3);
        }
        to {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.5), 0 0 30px rgba(0, 153, 255, 0.3);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
