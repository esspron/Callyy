import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VoicoryWidget',
      formats: ['umd', 'es', 'iife'],
      fileName: (format) => `voicory-widget.${format}.js`,
    },
    rollupOptions: {
      output: {
        globals: {},
        // Ensure all CSS is inlined
        assetFileNames: 'voicory-widget.[ext]',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
      },
    },
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
