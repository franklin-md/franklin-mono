import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import { franklinVitestAliases } from '../../../vitest.aliases.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	optimizeDeps: {
		include: ['react/jsx-dev-runtime', 'react/jsx-runtime'],
	},
	resolve: {
		alias: franklinVitestAliases(),
		dedupe: ['react', 'react-dom'],
	},
	test: {
		projects: [
			{
				plugins: [
					storybookTest({
						configDir: path.join(dirname, '.storybook'),
						storybookScript: 'npm run storybook -- --no-open',
					}),
				],
				test: {
					name: 'storybook',
					browser: {
						enabled: true,
						provider: playwright({}),
						headless: true,
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
});
