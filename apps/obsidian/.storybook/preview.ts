import type { Preview } from '@storybook/react-vite';

import { franklinPluginStylesheetDecorator } from './plugin-stylesheet.js';
import {
	obsidianThemeSelectorDecorator,
	obsidianThemeSelectorGlobalTypes,
	obsidianThemeSelectorInitialGlobals,
} from './theme-selector.js';

import './obsidian-default-theme-vars.css';
import './preview.css';

const preview: Preview = {
	initialGlobals: obsidianThemeSelectorInitialGlobals,
	globalTypes: obsidianThemeSelectorGlobalTypes,
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	decorators: [
		franklinPluginStylesheetDecorator,
		obsidianThemeSelectorDecorator,
	],
};

export default preview;
