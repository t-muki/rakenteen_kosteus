import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' -> tuotantobuild toimii sellaisenaan GitHub Pagesin alihakemistopolussa
// (https://kayttaja.github.io/repo/) ilman erillistä konfigurointia.
export default defineConfig({
  base: './',
  plugins: [react()],
});
