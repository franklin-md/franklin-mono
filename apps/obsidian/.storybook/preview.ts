import type { Preview } from '@storybook/react-vite';

import {
	obsidianThemeSelectorDecorator,
	obsidianThemeSelectorGlobalTypes,
	obsidianThemeSelectorInitialGlobals,
} from './theme-selector.js';

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
	decorators: [obsidianThemeSelectorDecorator],
};

export default preview;
