import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This makes the VITE_API_KEY environment variable available in the app as process.env.API_KEY
    // Note: In your deployment environment (like Vercel), the environment variable must be named VITE_API_KEY
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY),
  },
});
