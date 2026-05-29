import type { StorybookConfig } from '@storybook/react-vite';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import tsconfigPaths from 'vite-tsconfig-paths';

function getAbsolutePath(value: string) {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const storybookConfigDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(storybookConfigDir, '../../../..');

const config: StorybookConfig = {
	stories: ['../stories/**/*.stories.@(ts|tsx)'],
	addons: [
		getAbsolutePath('@storybook/addon-docs'),
		getAbsolutePath('@storybook/addon-vitest'),
	],
	framework: getAbsolutePath('@storybook/react-vite'),
	viteFinal: async (config) => {
		const { default: tailwindcss } = await import('@tailwindcss/vite');
		const existingAlias = config.resolve?.alias;
		const alias = Array.isArray(existingAlias)
			? [
					...existingAlias,
					{
						find: '@franklin/transport',
						replacement: '@franklin/transport/core',
					},
				]
			: [
					...Object.entries(existingAlias ?? {}).map(([find, replacement]) => ({
						find,
						replacement,
					})),
					{
						find: '@franklin/transport',
						replacement: '@franklin/transport/core',
					},
				];
		config.plugins = [
			...(config.plugins ?? []),
			tsconfigPaths({ root: workspaceRoot }),
			tailwindcss(),
		];
		config.resolve = {
			...config.resolve,
			alias,
			dedupe: [
				...new Set([...(config.resolve?.dedupe ?? []), 'react', 'react-dom']),
			],
		};
		config.optimizeDeps = {
			...config.optimizeDeps,
			include: [
				...new Set([
					...(config.optimizeDeps?.include ?? []),
					'react/jsx-dev-runtime',
					'react/jsx-runtime',
				]),
			],
		};
		return config;
	},
};

export default config;
