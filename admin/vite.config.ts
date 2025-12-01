import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5174, // Different port from main frontend (5173)
        // SECURITY: Only bind to localhost - admin panel should not be accessible externally
        host: 'localhost',
        // Enable HTTPS for local development (optional but recommended)
        // https: true,
    },
    // SECURITY: Don't expose source maps in production
    build: {
        sourcemap: false,
    },
});
