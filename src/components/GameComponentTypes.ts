/**
 * Defines unique Symbols for game-specific component types.
 * Follows the pattern outlined in Rule ECS-001.
 */
export const GameComponentTypes = {
  /** Identifies the SpinningCubeComponent. */
  SPINNING_CUBE: Symbol("SPINNING_CUBE"),
  /** Identifies the MenuItemComponent for 3D menu interactions. */
  MENU_ITEM: Symbol("MENU_ITEM"),
  TEXT: Symbol("TEXT"),
  // --- Add other game-specific component type symbols here ---
  // e.g., PLAYER_STATS: Symbol.for("game.playerStats"),
  // e.g., HEALTH: Symbol.for("game.health"),
} as const; // `as const` ensures the object properties are treated as literal types

/**
 * Union type representing all possible game-specific component type Symbols.
 * This type can be useful for functions that need to accept any game component type Symbol.
 */
export type GameComponentKeys =
  (typeof GameComponentTypes)[keyof typeof GameComponentTypes];
