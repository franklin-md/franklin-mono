import type { StorybookConfig } from '@storybook/react-vite';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function getAbsolutePath(value: string) {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function buildPlugin() {
	execFileSync(process.execPath, [resolve(packageDir, 'build/bundle.mjs')], {
		cwd: packageDir,
		stdio: 'inherit',
	});
}

buildPlugin();

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	staticDirs: [
		{
			from: resolve(packageDir, 'dist'),
			to: '/franklin-plugin',
		},
	],
	addons: [
		getAbsolutePath('@storybook/addon-docs'),
		getAbsolutePath('@storybook/addon-mcp'),
	],
	framework: getAbsolutePath('@storybook/react-vite'),
	viteFinal: (config) => {
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
