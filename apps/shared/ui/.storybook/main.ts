import type { StorybookConfig } from '@storybook/react-vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function getAbsolutePath(value: string) {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	addons: [getAbsolutePath('@storybook/addon-docs')],
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
			: Object.assign({}, existingAlias, {
					'@franklin/transport': '@franklin/transport/core',
				});
		config.plugins = [...(config.plugins ?? []), tailwindcss()];
		config.resolve = {
			...config.resolve,
			alias,
		};
		return config;
	},
};

export default config;
