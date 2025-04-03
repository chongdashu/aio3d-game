import { ComponentFactoryRegistry, loggingService } from "aio3d-core";
import * as THREE from "three";

// Import game-specific types and components
import { GameComponentTypes } from "./components/GameComponentTypes";
import { SpinningCubeComponent } from "./components/SpinningCubeComponent";
import {
  MenuItemComponent,
  MenuItemConfig,
} from "./components/ui/MenuItemComponent";
import { TextComponent } from "./components/ui/TextComponent";
// Import other game components as needed
// import { PlayerStatsComponent } from './components/PlayerStatsComponent';

// Create a logger for the factories module
const logger = loggingService.createLogger("GameFactories");

/**
 * Registers factory functions for all game-specific components
 * that are intended to be used within prefabs.
 *
 * This function should be called once during application initialization,
 * passing the core ComponentFactoryRegistry instance.
 *
 * @param factoryRegistry - The core ComponentFactoryRegistry instance to register with.
 */
export function registerGameFactories(
  factoryRegistry: ComponentFactoryRegistry
): void {
  logger.info("Registering game component factories");

  // --- Factory for SpinningCubeComponent ---
  factoryRegistry.registerFactory(
    GameComponentTypes.SPINNING_CUBE,
    (data?: { rotationSpeed?: THREE.Vector3 }) => {
      logger.debug("Creating SpinningCubeComponent", {
        rotationSpeed: data?.rotationSpeed,
      });
      // Pass rotationSpeed data to constructor if provided
      return new SpinningCubeComponent(data?.rotationSpeed);
    }
  );

  // --- Factory for MenuItemComponent ---
  factoryRegistry.registerFactory(
    GameComponentTypes.MENU_ITEM,
    (data?: MenuItemConfig) => {
      if (!data?.text || !data?.callback) {
        logger.error(
          "MenuItemComponent creation failed - missing required data",
          { data }
        );
        return null;
      }
      logger.debug("Creating MenuItemComponent", { text: data.text });
      return new MenuItemComponent(data);
    }
  );

  // --- Factory for TextComponent ---
  factoryRegistry.registerFactory(GameComponentTypes.TEXT, (data?: any) => {
    if (!data?.text) {
      logger.error("TextComponent creation failed - missing required text", {
        data,
      });
      return null;
    }
    logger.debug("Creating TextComponent", { text: data.text });
    return new TextComponent(data);
  });

  // --- Add factories for other game components here ---
  /* Example:
    factoryRegistry.registerFactory(
        GameComponentTypes.PLAYER_STATS, // Assuming this Symbol exists
        (data?: { health?: number; score?: number }) => {
            // Provide defaults if data is missing
            const health = data?.health ?? 100;
            const score = data?.score ?? 0;
            logger.debug("Creating PlayerStatsComponent", { health, score });
            // Ensure required components like Transform are handled elsewhere if needed
            return new PlayerStatsComponent(health, score);
        }
    );
    */

  logger.info("Game component factories registered successfully");
}
