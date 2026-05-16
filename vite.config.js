import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./pdf-studio",   // change to "/your-repo-name/" for GitHub Pages
});
