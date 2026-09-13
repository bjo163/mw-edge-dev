import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.MW_EDGE_UI_PORT ?? 5173),
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.MW_EDGE_PORT ?? 8788}`,
        changeOrigin: false,
      },
    },
  },
});
