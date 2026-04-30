import { configDefaults, defineConfig } from 'vitest/config';

import { franklinVitestAliases } from '../../../vitest.aliases.js';

export default defineConfig({
	resolve: {
		alias: franklinVitestAliases(),
	},
	test: {
		environment: 'jsdom',
		exclude: [...configDefaults.exclude, 'dist/**'],
	},
});
