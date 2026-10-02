import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative assets keep local previews and unknown GitHub Pages repo paths simple.
  // If the final site uses BrowserRouter or a fixed project path, update this base.
  base: "./",
});
