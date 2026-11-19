// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Command, Plugin, ViewCreator, WorkspaceLeaf } from 'obsidian';
import type { FranklinApp } from '@franklin/agent';
import { InboxController } from '../controller/index.js';
import { createInboxCodecPersistence } from '../testing/persistence.js';
import { registerInbox } from '../register.js';
import type { InboxView } from '../host/view.js';
import { clearPortalRoot } from '../../../shared/ui/portal.js';

type ProviderProps = { children: ReactNode };
vi.mock('@franklin/ui', async (original) => ({
	...(await original<Record<string, unknown>>()),
	ApplicationProvider: ({ children }: ProviderProps) => children,
}));

const scrollTo = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	'scrollTo',
);

afterEach(() => {
	if (scrollTo)
		Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollTo);
	else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
	cleanup();
	clearPortalRoot(document);
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

it('renders a newly registered Inbox before navigation and after reopening its pane', async () => {
	Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
		configurable: true,
		value: vi.fn(),
	});
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: true })),
	);
	const inbox = await InboxController.create({
		defaults: { provider: 'test', model: 'test', reasoning: 'low' },
		persistence: createInboxCodecPersistence(),
		run: vi.fn(),
	});
	let creator: ViewCreator | undefined;
	const commands: Command[] = [];
	const plugin = {
		manifest: { id: 'franklin' },
		registerView: (_type: string, create: ViewCreator) => {
			creator = create;
		},
		addRibbonIcon: vi.fn(),
		addCommand: (command: Command) => commands.push(command),
	} as unknown as Plugin;
	registerInbox({
		plugin,
		app: {} as FranklinApp,
		inbox,
		hostActionBindings: [],
	});
	if (!creator) throw new Error('Inbox view was not registered');
	expect(
		commands.find((command) => command.id === 'selection-to-study-inbox')?.name,
	).toBe('Add selection to study inbox');
	expect(commands.map((command) => command.id)).toEqual([
		'open-study-inbox',
		'selection-to-study-inbox',
	]);
	const view = creator({} as WorkspaceLeaf) as InboxView;
	view.contentEl.onWindowMigrated = () => () => {};
	document.body.append(view.contentEl);
	try {
		await act(() => view.onOpen());
		expect(
			screen.getByRole('textbox', { name: 'Ask a question' }),
		).toBeTruthy();
		expect(screen.getByText('No questions yet')).toBeTruthy();
		await act(() => view.onClose());
		expect(view.contentEl.childElementCount).toBe(0);
		await act(() => view.onOpen());
		expect(
			screen.getByRole('textbox', { name: 'Ask a question' }),
		).toBeTruthy();
	} finally {
		await act(() => view.onClose());
		await inbox.dispose();
	}
});
