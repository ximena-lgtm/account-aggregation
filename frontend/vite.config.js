import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true, // Falla si el puerto está ocupado en lugar de usar otro
    proxy: { "/api": "http://localhost:4000" }
  }
});
