import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // Make environment variables available to the app
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    server: {
      port: 5173,
      host: true,
      open: false,
    },
    build: {
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React libraries
            vendor: ['react', 'react-dom', 'react-router-dom'],
            
            // Heavy chart library
            charts: ['recharts'],
            
            // UI component libraries
            ui: [
              '@radix-ui/react-dialog', 
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
              '@radix-ui/react-select',
              '@radix-ui/react-popover',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-switch',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-slider',
              '@radix-ui/react-progress',
              '@radix-ui/react-avatar',
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-aspect-ratio',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-context-menu',
              '@radix-ui/react-hover-card',
              '@radix-ui/react-label',
              '@radix-ui/react-menubar',
              '@radix-ui/react-navigation-menu',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-separator',
              '@radix-ui/react-toast',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group'
            ],
            
            // Animation library
            animation: ['framer-motion'],
            
            // Crypto utilities
            crypto: ['crypto-js'],
            
            // Date utilities
            dates: ['date-fns'],
            
            // Form handling
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            
            // Data fetching
            query: ['@tanstack/react-query', '@tanstack/react-query-devtools'],
            
            // Other utilities
            utils: [
              'clsx', 
              'tailwind-merge', 
              'class-variance-authority',
              'cmdk',
              'embla-carousel-react',
              'input-otp',
              'lucide-react',
              'next-themes',
              'react-day-picker',
              'react-resizable-panels',
              'sonner',
              'tailwindcss-animate',
              'vaul'
            ],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['crypto-js'],
    },
  };
});
