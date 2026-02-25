import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import swc from 'unplugin-swc';

export default defineConfig({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/backend',

    plugins: [
        nxViteTsPaths(),
        // SWC plugin enables emitDecoratorMetadata which esbuild doesn't support.
        // Required for NestJS dependency injection to work.
        swc.vite({
            module: { type: 'es6' },
            jsc: {
                target: 'es2021',
                parser: {
                    syntax: 'typescript',
                    decorators: true,
                },
                transform: {
                    legacyDecorator: true,
                    decoratorMetadata: true,
                },
            },
        }),
    ],

    build: {
        outDir: '../../dist/apps/backend',
        emptyOutDir: true,
        reportCompressedSize: true,
        target: 'node20',
        ssr: './src/main.ts',
        rollupOptions: {
            output: {
                format: 'esm',
            },
        },
        sourcemap: true,
    },
});
