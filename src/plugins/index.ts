// Re-export plugin system from core
export type { Plugin } from 'aio3d-core';
export { registerPlugin, getPlugin, updatePlugins, cleanupPlugins } from 'aio3d-core';

// Export individual plugins
export * from './aiobot';
