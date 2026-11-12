// @vitest-environment jsdom
import { act } from '@testing-library/react';
import type { App } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveRegistry } from '../registry.js';
import { createDirectiveTestPersistence } from '../testing/persistence.js';
import { mountDirective } from '../render/mount.js';
import { clearPortalRoot } from '../../ui/portal.js';

afterEach(() => {
	clearPortalRoot(document);
	document.body.replaceChildren();
});

describe('directive rendering', () => {
	it('keeps a failing renderer readable without breaking the note', async () => {
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const instance = await registry
			.registerDirective('broken', () => {
				throw new Error('bad renderer');
			})
			.create({});
		const host = document.createElement('span');
		host.onWindowMigrated = vi.fn(() => vi.fn());
		document.body.append(host);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const expectedError = (event: ErrorEvent) => {
			if (event.message.includes('bad renderer')) event.preventDefault();
		};
		window.addEventListener('error', expectedError);
		try {
			let dispose!: () => void;
			await act(async () => {
				dispose = mountDirective(host, registry, instance);
			});
			expect(host.textContent).toBe(instance.text);
			await act(async () => {
				dispose();
			});
		} finally {
			error.mockRestore();
			window.removeEventListener('error', expectedError);
		}
	});

	it('updates every mounted copy and cleans up subscriptions on removal', async () => {
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: createDirectiveTestPersistence(),
		});
		const definition = registry.registerDirective<{ count: number }>(
			'counter',
			({ state }) => <span>Count {state.count}</span>,
		);
		const instance = await definition.create({ count: 1 });
		const hosts = [
			document.createElement('span'),
			document.createElement('span'),
		];
		for (const host of hosts) {
			host.onWindowMigrated = vi.fn(() => vi.fn());
			document.body.append(host);
		}
		const stop: (() => void)[] = [];
		await act(async () => {
			for (const host of hosts)
				stop.push(mountDirective(host, registry, instance));
		});
		expect(hosts.map((host) => host.textContent)).toEqual([
			'Count 1',
			'Count 1',
		]);
		await act(async () => {
			await instance.update((state) => {
				state.count = 2;
			});
		});
		expect(hosts.map((host) => host.textContent)).toEqual([
			'Count 2',
			'Count 2',
		]);
		await act(async () => {
			stop.forEach((dispose) => dispose());
		});
		expect(hosts.map((host) => host.textContent)).toEqual(['', '']);
	});

	it('leaves unknown references readable and resolves them when a renderer registers', async () => {
		const storage = createDirectiveTestPersistence();
		const original = await DirectiveRegistry.create({
			app: {} as App,
			persistence: storage,
		});
		const instance = await original
			.registerDirective('counter', () => null)
			.create({});
		const registry = await DirectiveRegistry.create({
			app: {} as App,
			persistence: storage,
		});
		const host = document.createElement('span');
		host.onWindowMigrated = vi.fn(() => vi.fn());
		document.body.append(host);
		let dispose!: () => void;
		await act(async () => {
			dispose = mountDirective(host, registry, instance);
		});
		expect(host.textContent).toBe(instance.text);
		await act(async () => {
			registry.registerDirective('counter', () => <span>ready</span>);
		});
		expect(host.textContent).toBe('ready');
		await act(async () => {
			dispose();
		});
	});
});
