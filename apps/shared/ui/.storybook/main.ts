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
		config.plugins = [...(config.plugins ?? []), tailwindcss()];
		return config;
	},
};

export default config;
