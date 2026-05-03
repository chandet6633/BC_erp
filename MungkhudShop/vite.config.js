import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    root: 'src',
    publicDir: resolve(__dirname, 'public'),
    base: '',
    resolve: {
        alias: {
            '@shared': resolve(__dirname, '../shared'),
        }
    },
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'src/index.html'),
            },
        },
        outDir: resolve(__dirname, 'pb_public'),
        emptyOutDir: true,
    },
    server: {
        port: 4000,
        open: '/index.html',
        fs: {
            allow: [resolve(__dirname, '..')]  // Allow access to parent (shared/)
        }
    }
})
