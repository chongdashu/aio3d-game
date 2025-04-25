import { World, Plugin, registerPlugin } from "aio3d-core";

// Import all plugin elements
import { CharacterUISystem } from "./systems";
import { registerAiBotPrefab } from "./prefabs/AiBotPrefab";
import { inspectAllAnimations } from "./utils";

/**
 * AIOBot Plugin for AIO3D Engine
 *
 * This plugin encapsulates all AIOBot-related functionality including
 * components, systems, prefabs, and utilities.
 */
export class AIOBotPlugin implements Plugin {
  name = "aiobot";
  version = "1.0.0";

  /**
   * Register the plugin with the ECS world
   * @param world The ECS world instance
   */
  register(world: World): void {
    // Register systems
    world.addSystem(new CharacterUISystem());

    // Register prefabs
    registerAiBotPrefab();

    console.log("AIOBot plugin registered");
  }

  /**
   * Initialize the plugin
   */
  init(): void {
    console.log("AIOBot plugin initialized");
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    console.log("AIOBot plugin cleaned up");
  }
}

/**
 * Convenience function to register the AIOBot plugin
 * @param world The ECS world instance
 */
export function registerAIOBotPlugin(world: World): void {
  const plugin = new AIOBotPlugin();
  registerPlugin(world, plugin);
}

// Export all plugin elements for direct imports
export * from "./systems";
export * from "./prefabs";
export * from "./utils";
export * from "./levels";
