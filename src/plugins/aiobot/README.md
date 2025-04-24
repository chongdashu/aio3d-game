# AIOBot Plugin

## Overview

The AIOBot plugin encapsulates all AIOBot-related functionality in a modular, self-contained structure within the game-template. This includes components, systems, prefabs, utilities, and levels specific to the AIOBot character.

## Features

- AIOBot character model and animations
- AIOBot-specific behaviors and interactions
- Utility functions for inspecting and managing AIOBot animations
- Example levels showcasing AIOBot functionality

## Usage

To use the AIOBot plugin in your game-template application:

```typescript
// In your main.ts or similar entry point
import { registerAIOBotPlugin } from '@/plugins/aiobot';

// Register the plugin with the world
registerAIOBotPlugin(world);
```

## Structure

```
plugins/aiobot/
  - components/     # AIOBot-specific components
  - systems/        # AIOBot-specific systems
  - prefabs/        # AIOBot-specific prefabs
  - utils/          # Utility functions
  - levels/         # Level definitions
  - index.ts        # Main entry point
  - README.md       # This documentation
```

## Assets

AIOBot uses the following assets:

- `/assets/models/aiobot/aibot_idle.glb`
- `/assets/models/aiobot/aibot_walk.glb`
- `/assets/models/aiobot/aibot_run.glb`

## Development

When adding new functionality to AIOBot, please add it to the appropriate subdirectory within the plugin structure to maintain modularity and organization.
