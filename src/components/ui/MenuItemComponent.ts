import { UIComponent, UIConfig } from "aio3d-core";
import { GameComponentTypes } from "../GameComponentTypes";
import * as THREE from "three";

/**
 * Configuration interface for MenuItemComponent
 */
export interface MenuItemConfig extends UIConfig {
  /** The text to display on the menu item */
  text: string;
  /** Callback function to execute when the menu item is clicked */
  callback: () => void;
  /** Color when the menu item is hovered */
  hoverColor?: THREE.Color;
  /** Normal color of the menu item */
  normalColor?: THREE.Color;
  /** Width of the menu item */
  width?: number;
  /** Height of the menu item */
  height?: number;
}

/**
 * Component that represents an interactive menu item in 3D space
 */
export class MenuItemComponent extends UIComponent {
  public readonly type = GameComponentTypes.MENU_ITEM;

  /** The text to display */
  public readonly text: string;

  /** Callback function for click events */
  public readonly callback: () => void;

  /** Color when hovered */
  public readonly hoverColor: THREE.Color;

  /** Normal color */
  public readonly normalColor: THREE.Color;

  /** Width of the menu item */
  public readonly width: number;

  /** Height of the menu item */
  public readonly height: number;

  /** Current hover state */
  private _isHovered: boolean = false;

  /**
   * Creates a new MenuItemComponent
   * @param config - Configuration for the menu item
   */
  constructor(config: MenuItemConfig) {
    // Pass UI-specific config to parent
    super({
      layer: config.layer ?? 10, // Default to layer 10 for menu items
      isInteractive: true, // Menu items are always interactive
      billboarded: config.billboarded ?? true, // Default to billboarded
    });

    this.text = config.text;
    this.callback = config.callback;
    this.hoverColor = config.hoverColor ?? new THREE.Color(0x4444ff);
    this.normalColor = config.normalColor ?? new THREE.Color(0x1a1a2e);
    this.width = config.width ?? 4;
    this.height = config.height ?? 0.8;
  }

  /**
   * Gets whether the menu item is currently hovered
   */
  public get isHovered(): boolean {
    return this._isHovered;
  }

  /**
   * Sets the hover state and updates the material color if a mesh is attached
   * @param value - The new hover state
   */
  public set isHovered(value: boolean) {
    if (this._isHovered !== value) {
      this._isHovered = value;
      // Note: Material color updates will be handled by the MenuInteractionSystem
    }
  }

  /**
   * Executes the callback function when the menu item is clicked
   */
  public click(): void {
    this.callback();
  }
}
