
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: resolve(__dirname, "src") }
    ],
  },
  server: {
    open: true,
  },
  define: {
    'process.env': process.env,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  }
});
