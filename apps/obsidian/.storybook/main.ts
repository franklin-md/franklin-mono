import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function getAbsolutePath(value: string) {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const storybookDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(storybookDir, '..');

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	addons: [
		getAbsolutePath('@storybook/addon-docs'),
		getAbsolutePath('@storybook/addon-mcp'),
	],
	framework: getAbsolutePath('@storybook/react-vite'),
	viteFinal: async (config) => {
		const { default: tailwindcss } = await import('@tailwindcss/vite');
		config.plugins = [...(config.plugins ?? []), tailwindcss()];
		config.resolve = {
			...config.resolve,
			alias: {
				obsidian: resolve(packageDir, 'src/mocks/obsidian/index.ts'),
				// TODO: This is a smell, and we may just need to fix the packaging of transport.
				// Remap barrel imports to browser-safe subpaths so Storybook
				// never pulls in Node-only transitive dependencies.
				'@franklin/transport': '@franklin/transport/core',
			},
		};
		return config;
	},
};

export default config;
