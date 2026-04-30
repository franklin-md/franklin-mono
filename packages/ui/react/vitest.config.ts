import { configDefaults, defineConfig } from 'vitest/config';

import { franklinVitestAliases } from '../../../vitest.aliases';

export default defineConfig({
	resolve: {
		alias: franklinVitestAliases(),
	},
	test: {
		environment: 'jsdom',
		exclude: [...configDefaults.exclude, 'dist/**'],
	},
});
