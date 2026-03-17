import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

import type { Plugin } from 'vite';

/**
 * Vite plugin that errors at build time when renderer code tries to import
 * a Node built-in (node:fs, node:child_process, etc.). This catches cases
 * where a barrel import transitively pulls in Node-only code.
 */
function noNodeBuiltins(): Plugin {
	return {
		name: 'no-node-builtins',
		resolveId(source) {
			if (source.startsWith('node:')) {
				this.error(
					`Node built-in "${source}" cannot be used in renderer code. ` +
						`Check for non-browser-safe barrel imports.`,
				);
			}
			return null;
		},
	};
}

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
		plugins: [react(), tailwindcss(), noNodeBuiltins()],
		build: {
			rollupOptions: {
				input: resolve(__dirname, 'src/renderer/index.html'),
			},
		},
		resolve: {
			alias: [
				{
					find: '@',
					replacement: resolve(__dirname, 'src/renderer/src'),
				},
				// Remap barrel imports to browser-safe subpaths so renderer
				// code never pulls in Node-only transitive dependencies.
				{
					find: /^@franklin\/transport$/,
					replacement: '@franklin/transport/core',
				},
				{
					find: /^@franklin\/local-mcp$/,
					replacement: '@franklin/local-mcp/browser',
				},
			],
		},
	},
});
