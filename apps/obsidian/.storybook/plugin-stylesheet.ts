import type { Decorator } from '@storybook/react-vite';

const FRANKLIN_PLUGIN_STYLESHEET_ID = 'franklin-storybook-plugin-css';
const FRANKLIN_PLUGIN_STYLESHEET_HREF = '/franklin-plugin/styles.css';

export const franklinPluginStylesheetDecorator: Decorator = (
	Story,
	context,
) => {
	ensureFranklinPluginStylesheet(context.canvasElement.ownerDocument);

	return Story();
};

function ensureFranklinPluginStylesheet(activeDocument: Document) {
	const existing = activeDocument.getElementById(FRANKLIN_PLUGIN_STYLESHEET_ID);
	if (existing instanceof HTMLLinkElement) {
		existing.href = FRANKLIN_PLUGIN_STYLESHEET_HREF;
		return;
	}

	// Storybook's preview iframe starts with host CSS; inject the generated
	// plugin stylesheet after it so the cascade matches Obsidian's token flow.
	// eslint-disable-next-line obsidianmd/prefer-create-el
	const link = activeDocument.createElement('link');
	link.id = FRANKLIN_PLUGIN_STYLESHEET_ID;
	link.rel = 'stylesheet';
	link.href = FRANKLIN_PLUGIN_STYLESHEET_HREF;
	activeDocument.head.append(link);
}
