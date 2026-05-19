import { configDefaults, defineConfig } from 'vitest/config';

import { franklinVitestAliases } from '../../vitest.aliases';

export default defineConfig({
	resolve: {
		alias: franklinVitestAliases(),
	},
	test: {
		exclude: [...configDefaults.exclude, 'dist/**'],
	},
});
