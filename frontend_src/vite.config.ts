import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue2';
import { defineConfig } from 'vite';

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.API_URL || 'http://localhost:8020';

export default defineConfig(({ command }) => {
    return {
        root: currentDir,
        base: command === 'build' ? '/spa/' : '/',
        plugins: [vue()],
        resolve: {
            dedupe: ['vue'],
        },
        build: {
            emptyOutDir: true,
            outDir: join(currentDir, '..', 'polemarch', 'static', 'spa'),
        },
        server: {
            host: true,
            port: 8033,
            proxy: {
                '/api': {
                    target: new URL('/api/', apiUrl),
                },
                '/static': {
                    target: new URL('/static/', apiUrl),
                },
                '/.well-known': {
                    target: new URL('/.well-known/', apiUrl),
                },
                '/manifest.json': {
                    target: new URL('/manifest.json', apiUrl),
                },
                '/service-worker.js': {
                    target: new URL('/service-worker.js', apiUrl),
                },
            },
            fs: {
                allow: [
                    // Polemarch root dir
                    join(currentDir, '..'),
                    // Allow serve vstutils files when package linked
                    join(currentDir, '..', '..', 'vst-utils'),
                    join(currentDir, '..', '..', '..', 'vst-utils'),
                ],
            },
        },
    };
});
