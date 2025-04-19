import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react(),
        viteStaticCopy({
            targets: [
                {
                    src: 'worker.js',
                    dest: '.'
                },
                {
                    src: 'manifest.json',
                    dest: '.'
                }
            ]
        })
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'index.html'),
                local: resolve(__dirname, 'local.html')
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash][extname]'
            }
        }
    },
    base: './'
});