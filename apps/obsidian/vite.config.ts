import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { franklinPrefix } from './build/prefix.mjs';
import { obsidianSync } from './build/sync.mjs';

export default defineConfig({
	plugins: [react(), tailwindcss(), obsidianSync()],
	build: {
		outDir: 'dist',
		emptyOutDir: false,
		sourcemap: true,
		lib: {
			entry: resolve(import.meta.dirname, 'src/main.ts'),
			formats: ['cjs'],
			fileName: () => 'main.js',
		},
		rollupOptions: {
			external: ['obsidian', /^@codemirror\//, /^@lezer\//],
			output: {
				assetFileNames: (info) =>
					info.names?.some((n) => n.endsWith('.css'))
						? 'styles.css'
						: (info.names?.[0] ?? 'asset'),
			},
		},
		cssCodeSplit: false,
	},
	css: {
		postcss: {
			plugins: [franklinPrefix()],
		},
	},
});
