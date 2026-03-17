import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				input: resolve(__dirname, 'src/main/index.ts'),
			},
		},
	},
	preload: {
		build: {
			rollupOptions: {
				input: resolve(__dirname, 'src/preload/index.ts'),
				output: {
					format: 'cjs',
				},
				external: ['electron'],
			},
		},
	},
	renderer: {
		root: resolve(__dirname, 'src/renderer'),
		plugins: [react(), tailwindcss()],
		build: {
			rollupOptions: {
				input: resolve(__dirname, 'src/renderer/index.html'),
			},
		},
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src/renderer/src'),
			},
		},
	},
});
