import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

const dirnameOfConfig = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(dirnameOfConfig, './src/renderer/src'),
		},
	},
	test: {
		exclude: [...configDefaults.exclude, 'dist/**', 'out/**'],
	},
});
