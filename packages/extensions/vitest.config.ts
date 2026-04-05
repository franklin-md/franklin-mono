import { configDefaults, defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			'@franklin/lib': path.resolve(__dirname, '../lib/core/src/index.ts'),
			'@franklin/mini-acp': path.resolve(__dirname, '../mini-acp/src/index.ts'),
			'@franklin/transport': path.resolve(
				__dirname,
				'../lib/transport/src/core.ts',
			),
		},
	},
	test: {
		exclude: [...configDefaults.exclude, 'dist/**'],
	},
});
