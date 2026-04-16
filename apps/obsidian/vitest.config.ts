import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

import { franklinVitestAliases } from '../../vitest.aliases.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: [
			...franklinVitestAliases(),
			// TODO(FRA-193): Build out the full obsidian mock package
			{
				find: /^obsidian$/,
				replacement: path.resolve(__dirname, 'src/mocks/obsidian/index.ts'),
			},
		],
	},
	test: {
		exclude: [...configDefaults.exclude, 'dist/**'],
	},
});
