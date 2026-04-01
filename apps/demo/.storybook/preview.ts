import type { Preview } from '@storybook/react-vite';
import React from 'react';

import '@fontsource-variable/inter';
import '@fontsource-variable/geist-mono';
import '../src/renderer/src/globals.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	decorators: [
		(Story) =>
			React.createElement(
				'div',
				{ className: 'dark bg-background text-foreground min-h-screen p-4' },
				React.createElement(Story),
			),
	],
};

export default preview;
