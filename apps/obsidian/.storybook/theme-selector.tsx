import type { Decorator, Preview } from '@storybook/react-vite';

const OBSIDIAN_COLOR_SCHEME_GLOBAL = 'obsidianColorScheme';
const OBSIDIAN_THEME_HOST_CLASS = 'franklin-storybook-obsidian-theme';
const OBSIDIAN_BODY_CLASSES = [
	OBSIDIAN_THEME_HOST_CLASS,
	'theme-light',
	'theme-dark',
] as const;

type ObsidianColorScheme = 'light' | 'dark';
type PreviewInitialGlobals = NonNullable<Preview['initialGlobals']>;
type PreviewGlobalTypes = NonNullable<Preview['globalTypes']>;

export const obsidianThemeSelectorInitialGlobals: PreviewInitialGlobals = {
	[OBSIDIAN_COLOR_SCHEME_GLOBAL]: 'dark',
};

export const obsidianThemeSelectorGlobalTypes: PreviewGlobalTypes = {
	[OBSIDIAN_COLOR_SCHEME_GLOBAL]: {
		name: 'Obsidian theme',
		description: 'Obsidian body theme class.',
		toolbar: {
			icon: 'mirror',
			items: [
				{ value: 'light', title: 'Light' },
				{ value: 'dark', title: 'Dark' },
			],
			dynamicTitle: true,
		},
	},
};

export const obsidianThemeSelectorDecorator: Decorator = (Story, context) => {
	const colorScheme = getColorScheme(
		context.globals[OBSIDIAN_COLOR_SCHEME_GLOBAL],
	);

	applyObsidianShell(context.canvasElement.ownerDocument, colorScheme);

	return (
		<div className="franklin franklin-storybook-shell">
			<Story />
		</div>
	);
};

function getColorScheme(value: unknown): ObsidianColorScheme {
	return value === 'light' ? 'light' : 'dark';
}

function applyObsidianShell(
	activeDocument: Document,
	colorScheme: ObsidianColorScheme,
) {
	applyObsidianBodyClasses(activeDocument.body, colorScheme);
}

function applyObsidianBodyClasses(
	body: HTMLElement,
	colorScheme: ObsidianColorScheme,
) {
	// Franklin's Obsidian styles key off the same body classes Obsidian sets.
	body.classList.remove(...OBSIDIAN_BODY_CLASSES);
	body.classList.add(OBSIDIAN_THEME_HOST_CLASS, `theme-${colorScheme}`);
}
