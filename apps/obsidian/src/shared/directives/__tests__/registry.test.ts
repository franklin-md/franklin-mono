import { MemoryFilesystem, toAbsolutePath } from '@franklin/lib';
import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { DirectiveRegistry } from '../registry.js';
import { createDirectiveTestPersistence as persistence } from '../testing/registry.js';

const path = toAbsolutePath('/directives.json');
const app = {} as App;
const Renderer = () => null;

describe('directive instances', () => {
	it('persists instances and restores typed handles without registering renderers in storage', async () => {
		const storage = persistence();
		const registry = await DirectiveRegistry.create({
			app,
			persistence: storage,
		});
		const definition = registry.registerDirective<{ count: number }>(
			'counter',
			Renderer,
		);
		const initial = { count: 1 };
		const pending = definition.create(initial);
		initial.count = 99;
		const instance = await pending;
		expect(instance.state.get().count).toBe(1);
		expect((await storage.load()).value?.instances[instance.id]?.state).toEqual(
			{ count: 1 },
		);
		expect(instance.text).toBe(`:::franklin:counter:${instance.id}:::`);
		await instance.update((state) => {
			state.count++;
		});
		const restored = await DirectiveRegistry.create({
			app,
			persistence: storage,
		});
		const handle = restored
			.registerDirective<{ count: number }>('counter', Renderer)
			.get(instance.id);
		expect(handle?.state.get()).toEqual({ count: 2 });
		expect(restored.registerDirective('empty', Renderer).instances()).toEqual(
			[],
		);
		expect(definition.instances().map((item) => item.id)).toEqual([
			instance.id,
		]);
		expect((await storage.load()).value?.instances[instance.id]).toEqual({
			name: 'counter',
			state: { count: 2 },
		});
		expect(
			restored.registerDirective('other', Renderer).get(instance.id),
		).toBeUndefined();
	});

	it('serializes concurrent recipes and publishes only successfully saved changes', async () => {
		const storage = persistence();
		const registry = await DirectiveRegistry.create({
			app,
			persistence: storage,
		});
		const instance = await registry
			.registerDirective<{ count: number }>('counter', Renderer)
			.create({ count: 0 });
		const listener = vi.fn();
		instance.state.subscribe(listener);
		const save = vi
			.spyOn(storage, 'save')
			.mockRejectedValueOnce(new Error('disk full'));
		await expect(
			instance.update((state) => {
				state.count = 100;
			}),
		).rejects.toThrow('disk full');
		expect(instance.state.get()).toEqual({ count: 0 });
		expect(listener).not.toHaveBeenCalled();
		save.mockRestore();
		await Promise.all([
			instance.update((state) => {
				state.count++;
			}),
			instance.update((state) => {
				state.count++;
			}),
		]);
		expect(instance.state.get()).toEqual({ count: 2 });
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('restores pending writes from the previous plugin before accepting new ones', async () => {
		const storage = persistence();
		const options = { app, persistence: storage };
		const previous = await DirectiveRegistry.create(options);
		let finish!: () => void;
		const pending = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const persist = storage.save.bind(storage);
		vi.spyOn(storage, 'save').mockImplementationOnce(async (doc) => {
			await pending;
			await persist(doc);
		});
		const first = previous.registerDirective('counter', Renderer).create(1);
		const draining = previous.dispose();
		vi.resetModules();
		const { DirectiveRegistry: ReloadedRegistry } =
			await import('../registry.js');
		const reopening = ReloadedRegistry.create(options);
		finish();
		const [instance, , reopened] = await Promise.all([
			first,
			draining,
			reopening,
		]);
		const definition = reopened.registerDirective('counter', Renderer);
		await definition.create(2);
		expect(definition.get(instance.id)?.state.get()).toBe(1);
		expect(
			Object.keys((await storage.load()).value?.instances ?? {}),
		).toHaveLength(2);
	});

	it('keeps a saved update successful and notifies later subscribers if one throws', async () => {
		const storage = persistence();
		const registry = await DirectiveRegistry.create({
			app,
			persistence: storage,
		});
		const instance = await registry
			.registerDirective<number>('counter', Renderer)
			.create(0);
		const report = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			instance.state.subscribe(() => {
				throw new Error('observer failed');
			});
			const listener = vi.fn();
			instance.state.subscribe(listener);
			await instance.update((value) => value + 1);
			expect(listener).toHaveBeenCalledWith(1);
			expect(report).toHaveBeenCalled();
			expect((await storage.load()).value?.instances[instance.id]?.state).toBe(
				1,
			);
		} finally {
			report.mockRestore();
		}
	});

	it('rejects duplicate names, invalid names, and non-JSON state', async () => {
		const registry = await DirectiveRegistry.create({
			app,
			persistence: persistence(),
		});
		const definition = registry.registerDirective('counter', Renderer);
		expect(() => registry.registerDirective('counter', Renderer)).toThrow(
			'registered',
		);
		expect(() => registry.registerDirective('bad:name', Renderer)).toThrow(
			'name',
		);
		await expect(definition.create(new Date())).rejects.toThrow('JSON');
		const cycle: Record<string, unknown> = {};
		cycle.self = cycle;
		await expect(definition.create(cycle)).rejects.toThrow('JSON');
	});

	it('preserves unreadable storage and rejects work after disposal', async () => {
		const filesystem = new MemoryFilesystem();
		await filesystem.writeFile(path, '{broken');
		await expect(
			DirectiveRegistry.create({ app, persistence: persistence(filesystem) }),
		).rejects.toThrow('load');
		expect(new TextDecoder().decode(await filesystem.readFile(path))).toBe(
			'{broken',
		);
		const registry = await DirectiveRegistry.create({
			app,
			persistence: persistence(),
		});
		const definition = registry.registerDirective('counter', Renderer);
		await registry.dispose();
		await expect(definition.create({ count: 0 })).rejects.toThrow('closed');
	});
});
