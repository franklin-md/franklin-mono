import type { StorybookConfig } from '@storybook/react-vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function getAbsolutePath(value: string) {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const config: StorybookConfig = {
	stories: ['../src/renderer/src/**/*.stories.@(ts|tsx)'],
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
				'@': `${dirname(fileURLToPath(import.meta.url))}/../src/renderer/src`,
			},
		};
		return config;
	},
};

export default config;
