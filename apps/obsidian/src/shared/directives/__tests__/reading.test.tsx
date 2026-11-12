// @vitest-environment jsdom
import { act } from '@testing-library/react';
import type {
	App,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
} from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveRegistry } from '../registry.js';
import { createDirectiveTestPersistence } from '../testing/persistence.js';
import { createDirectivePostProcessor } from '../reading/processor.js';
import { clearPortalRoot } from '../../ui/portal.js';

vi.mock('obsidian', async (original) => ({
	...(await original<Record<string, unknown>>()),
	MarkdownRenderChild: class {
		constructor(readonly containerEl: HTMLElement) {}
	},
}));
afterEach(() => {
	clearPortalRoot(document);
	document.body.replaceChildren();
});

describe('Reading mode directives', () => {
	it('preserves escaped examples when source and rendered text are ambiguous', async () => {
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const instance = await registry
			.registerDirective('counter', () => <span>widget</span>)
			.create({});
		const host = document.createElement('p');
		host.textContent = `${instance.text} ${instance.text}`;
		const addChild = vi.fn();
		const context = {
			getSectionInfo: () => ({
				text: `\\${instance.text} ${instance.text}`,
				lineStart: 0,
				lineEnd: 0,
			}),
			addChild,
		} as unknown as MarkdownPostProcessorContext;
		await createDirectivePostProcessor(registry)(host, context);
		expect(addChild).not.toHaveBeenCalled();
		expect(host.textContent).toBe(`${instance.text} ${instance.text}`);
	});

	it('mounts inline copies, excludes code, and disposes with the Markdown section', async () => {
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const instance = await registry
			.registerDirective<{
				count: number;
			}>('counter', ({ state }) => <span>Count {state.count}</span>)
			.create({ count: 1 });
		const host = document.createElement('p');
		const code = document.createElement('code');
		code.textContent = instance.text;
		host.append('before ', instance.text, code);
		document.body.append(host);
		const children: MarkdownRenderChild[] = [];
		const context = {
			getSectionInfo: () => null,
			addChild: (child: MarkdownRenderChild) => {
				children.push(child);
				child.onload();
			},
		} as unknown as MarkdownPostProcessorContext;
		const migrated = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'onWindowMigrated',
		);
		Object.defineProperty(HTMLElement.prototype, 'onWindowMigrated', {
			configurable: true,
			value: () => () => {},
		});
		try {
			await act(async () => {
				await createDirectivePostProcessor(registry)(host, context);
			});
			expect(children).toHaveLength(1);
			expect(host.textContent).toBe(`before Count 1${instance.text}`);
			await act(async () => {
				await instance.update((state) => {
					state.count = 2;
				});
			});
			expect(host.textContent).toBe(`before Count 2${instance.text}`);
			await act(async () => {
				children.forEach((child) => child.onunload());
			});
		} finally {
			if (migrated)
				Object.defineProperty(
					HTMLElement.prototype,
					'onWindowMigrated',
					migrated,
				);
			else Reflect.deleteProperty(HTMLElement.prototype, 'onWindowMigrated');
		}
	});
});
