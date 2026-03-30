import { configDefaults, defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			'@franklin/lib': path.resolve(__dirname, '../lib/core/src/index.ts'),
			'@franklin/extensions': path.resolve(
				__dirname,
				'../extensions/src/index.ts',
			),
		},
	},
	test: {
		exclude: [...configDefaults.exclude, 'dist/**'],
	},
});
