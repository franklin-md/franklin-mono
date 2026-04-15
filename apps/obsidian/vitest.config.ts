import { configDefaults, defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			'@franklin/lib': path.resolve(
				__dirname,
				'../../packages/lib/core/src/index.ts',
			),
			'@franklin/extensions': path.resolve(
				__dirname,
				'../../packages/extensions/src/index.ts',
			),
			'@franklin/agent': path.resolve(
				__dirname,
				'../../packages/agent/src/index.ts',
			),
			'@franklin/agent/browser': path.resolve(
				__dirname,
				'../../packages/agent/src/browser.ts',
			),
			// TODO: Build out the full obsidian mock package
			obsidian: path.resolve(__dirname, 'src/mocks/obsidian/index.ts'),
		},
	},
	test: {
		exclude: [...configDefaults.exclude, 'dist/**'],
	},
});
