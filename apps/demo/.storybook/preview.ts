import type { Preview } from '@storybook/react-vite';

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
};

export default preview;
