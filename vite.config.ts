import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' is crucial for GitHub Pages to ensure assets are loaded correctly
  // when the app is hosted in a subdirectory (e.g., user.github.io/repo-name/)
  base: './', 
});