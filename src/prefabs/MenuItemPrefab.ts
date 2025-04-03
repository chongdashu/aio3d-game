import { Prefab, ComponentTypes as CoreTypes } from "aio3d-core";
import { GameComponentTypes } from "../components/GameComponentTypes";
import * as THREE from "three";
import { MenuItemConfig } from "../components/ui/MenuItemComponent";

/**
 * Configuration interface for MenuItemPrefab
 */
export interface MenuItemPrefabConfig {
  /** The text to display on the menu item */
  text: string;
  /** Callback function to execute when the menu item is clicked */
  callback: () => void;
  /** Position of the menu item */
  position?: THREE.Vector3;
  /** Rotation of the menu item */
  rotation?: THREE.Euler;
  /** Scale of the menu item */
  scale?: THREE.Vector3;
  /** Width of the menu item */
  width?: number;
  /** Height of the menu item */
  height?: number;
  /** Color when the menu item is hovered */
  hoverColor?: THREE.Color;
  /** Normal color of the menu item */
  normalColor?: THREE.Color;
  /** Font size for the text */
  fontSize?: number;
  /** Font family for the text */
  fontFamily?: string;
  /** Text color */
  textColor?: string;
}

/**
 * Creates a prefab for a 3D menu item
 * @param config - Configuration for the menu item
 * @returns Prefab definition for the menu item
 */
export const createMenuItemPrefab = (config: MenuItemPrefabConfig): Prefab => {
  const position = config.position ?? new THREE.Vector3(0, 0, 0);
  const rotation = config.rotation ?? new THREE.Euler(0, 0, 0);
  const scale = config.scale ?? new THREE.Vector3(1, 1, 1);
  const width = config.width ?? 4;
  const height = config.height ?? 0.8;

  return {
    name: `MenuItem_${config.text}`,
    components: [
      // Transform component for positioning
      {
        type: CoreTypes.TRANSFORM,
        data: {
          position,
          rotation,
          scale,
        },
      },
      // UI component for registration with UI system
      {
        type: CoreTypes.UI,
        data: {
          layer: 10, // Menu items are on layer 10
          isInteractive: true,
          billboarded: true,
        },
      },
      // Mesh component for visual representation (background)
      {
        type: CoreTypes.MESH,
        data: {
          geometryType: "PlaneGeometry",
          geometryArgs: [width, height],
          materials: [
            {
              type: "MeshStandardMaterial",
              args: [
                {
                  color: config.normalColor ?? 0x1a1a2e,
                  metalness: 0.2,
                  roughness: 0.8,
                  transparent: true,
                  opacity: 0.9,
                  side: THREE.DoubleSide,
                },
              ],
            },
          ],
        },
      },
      // Text component for the label
      {
        type: GameComponentTypes.TEXT,
        data: {
          text: config.text,
          fontSize: config.fontSize ?? 64,
          fontFamily: config.fontFamily ?? "Arial",
          color: config.textColor ?? "#ffffff",
          textAlign: "center",
          backgroundColor: "transparent",
          padding: 20,
        },
      },
      // Menu item component for interaction
      {
        type: GameComponentTypes.MENU_ITEM,
        data: {
          text: config.text,
          callback: config.callback,
          width,
          height,
          normalColor: config.normalColor,
          hoverColor: config.hoverColor,
        },
      },
    ],
  };
};

// Example usage:
/*
const menuItem = createMenuItemPrefab({
  text: "Start Game",
  callback: () => {
    // Use the logger from the component/system that creates the menu item
    // e.g., this.logger.info("Start Game clicked");
  },
  position: new THREE.Vector3(0, 2, 0)
});
*/
