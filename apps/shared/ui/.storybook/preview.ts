import type { Preview } from '@storybook/react-vite';
import React from 'react';

import './preview.css';

const preview: Preview = {
	initialGlobals: {
		theme: 'dark',
	},
	globalTypes: {
		theme: {
			name: 'Theme',
			toolbar: {
				icon: 'circlehollow',
				items: ['light', 'dark'],
				dynamicTitle: true,
			},
		},
	},
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	decorators: [
		(Story, context) =>
			React.createElement(
				'div',
				{
					className: [
						context.globals.theme === 'dark' ? 'dark' : '',
						'bg-background text-foreground min-h-screen p-6',
					]
						.filter(Boolean)
						.join(' '),
				},
				React.createElement(Story),
			),
	],
};

export default preview;
