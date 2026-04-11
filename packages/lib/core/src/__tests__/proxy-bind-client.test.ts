import { describe, it, expect, vi } from 'vitest';
import {
	method,
	notification,
	event,
	namespace,
	resource,
	stream,
} from '../proxy/descriptors/factories/index.js';
import {
	bindClient,
	UnsupportedDescriptorError,
} from '../proxy/bind/client.js';
import type { ProxyRuntime } from '../proxy/runtime.js';

describe('bindClient', () => {
	it('binds a single method descriptor directly', () => {
		const stub = vi.fn().mockResolvedValue(42);
		const runtime: ProxyRuntime = {
			bindMethod: vi.fn().mockReturnValue(stub),
		};

		const result = bindClient(method(), runtime);

		expect(runtime.bindMethod).toHaveBeenCalledWith([]);
		expect(result).toBe(stub);
	});

	it('binds a namespace with method members', () => {
		const stub = vi.fn().mockResolvedValue(42);
		const runtime: ProxyRuntime = {
			bindMethod: vi.fn().mockReturnValue(stub),
		};

		const proxy = bindClient(namespace({ add: method() }), runtime);

		expect(runtime.bindMethod).toHaveBeenCalledWith(['add']);
		expect(proxy.add).toBe(stub);
	});

	it('binds notification descriptors via runtime.bindNotification', () => {
		const stub = vi.fn().mockResolvedValue(undefined);
		const runtime: ProxyRuntime = {
			bindNotification: vi.fn().mockReturnValue(stub),
		};

		const proxy = bindClient(namespace({ ping: notification() }), runtime);

		expect(runtime.bindNotification).toHaveBeenCalledWith(['ping']);
		expect(proxy.ping).toBe(stub);
	});

	it('binds event descriptors via runtime.bindEvent', () => {
		const stub = async function* () {
			yield 1;
		};
		const runtime: ProxyRuntime = {
			bindEvent: vi.fn().mockReturnValue(stub),
		};

		const proxy = bindClient(namespace({ logs: event() }), runtime);

		expect(runtime.bindEvent).toHaveBeenCalledWith(['logs']);
		expect(proxy.logs).toBe(stub);
	});

	it('recurses into namespace descriptors', () => {
		const stub = vi.fn().mockResolvedValue(true);
		const runtime: ProxyRuntime = {
			bindMethod: vi.fn().mockReturnValue(stub),
		};

		const proxy = bindClient(
			namespace({
				fs: namespace({
					exists: method(),
				}),
			}),
			runtime,
		);

		expect(runtime.bindMethod).toHaveBeenCalledWith(['fs', 'exists']);
		expect((proxy.fs as Record<string, unknown>).exists).toBe(stub);
	});

	it('binds resource(stream) by calling bindResource and recursing into inner', async () => {
		const streamValue = { readable: 'r', writable: 'w', close: vi.fn() };
		const resourceRuntime: ProxyRuntime = {
			bindStream: vi.fn().mockReturnValue(streamValue),
		};
		const runtime: ProxyRuntime = {
			bindResource: vi.fn().mockReturnValue({
				connect: vi.fn().mockResolvedValue('res-1'),
				kill: vi.fn().mockResolvedValue(undefined),
				inner: vi.fn().mockReturnValue(resourceRuntime),
			}),
		};

		const proxy = bindClient(
			namespace({ spawn: resource<[string]>(stream()) }),
			runtime,
		);

		expect(runtime.bindResource).toHaveBeenCalledWith(['spawn']);
		expect(typeof proxy.spawn).toBe('function');

		const instance = await (
			proxy.spawn as (...args: unknown[]) => Promise<unknown>
		)('arg1');
		const binding = (runtime.bindResource as ReturnType<typeof vi.fn>).mock
			.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
		expect(binding.connect).toHaveBeenCalledWith('arg1');
		expect(binding.inner).toHaveBeenCalledWith('res-1');
		expect(resourceRuntime.bindStream).toHaveBeenCalledWith([]);
		expect(instance).toEqual(
			expect.objectContaining({
				readable: 'r',
				writable: 'w',
				dispose: expect.any(Function),
			}),
		);
	});

	it('binds resource(namespace) by calling bindResource and recursing into inner members', async () => {
		const methodStub = vi.fn().mockResolvedValue(42);
		const resourceRuntime: ProxyRuntime = {
			bindMethod: vi.fn().mockReturnValue(methodStub),
		};
		const runtime: ProxyRuntime = {
			bindResource: vi.fn().mockReturnValue({
				connect: vi.fn().mockResolvedValue('res-2'),
				kill: vi.fn().mockResolvedValue(undefined),
				inner: vi.fn().mockReturnValue(resourceRuntime),
			}),
		};

		const proxy = bindClient(
			namespace({ handle: resource(namespace({ doThing: method() })) }),
			runtime,
		);

		expect(runtime.bindResource).toHaveBeenCalledWith(['handle']);

		const instance = (await (
			proxy.handle as (...args: unknown[]) => Promise<unknown>
		)()) as Record<string, unknown>;
		const binding = (runtime.bindResource as ReturnType<typeof vi.fn>).mock
			.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
		expect(binding.connect).toHaveBeenCalledWith();
		expect(binding.inner).toHaveBeenCalledWith('res-2');
		expect(resourceRuntime.bindMethod).toHaveBeenCalledWith(['doThing']);
		expect(instance.doThing).toBe(methodStub);
		expect(typeof instance.dispose).toBe('function');
	});

	it('dispose on resource calls binding.kill', async () => {
		const kill = vi.fn().mockResolvedValue(undefined);
		const resourceRuntime: ProxyRuntime = {
			bindStream: vi
				.fn()
				.mockReturnValue({ readable: 'r', writable: 'w', close: vi.fn() }),
		};
		const runtime: ProxyRuntime = {
			bindResource: vi.fn().mockReturnValue({
				connect: vi.fn().mockResolvedValue('res-3'),
				kill,
				inner: vi.fn().mockReturnValue(resourceRuntime),
			}),
		};

		const factory = bindClient(resource(stream()), runtime) as (
			...args: unknown[]
		) => Promise<Record<string, unknown>>;
		const instance = await factory();
		await (instance.dispose as () => Promise<void>)();
		expect(kill).toHaveBeenCalledWith('res-3');
	});

	it('throws UnsupportedDescriptorError when runtime lacks method', () => {
		const runtime: ProxyRuntime = {};

		expect(() => bindClient(method(), runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('throws UnsupportedDescriptorError for unsupported notification', () => {
		const runtime: ProxyRuntime = {};

		expect(() => bindClient(notification(), runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('throws UnsupportedDescriptorError for unsupported event', () => {
		const runtime: ProxyRuntime = {};

		expect(() => bindClient(event(), runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('throws UnsupportedDescriptorError for unsupported resource', () => {
		const runtime: ProxyRuntime = {};

		expect(() => bindClient(resource(stream()), runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('handles deeply nested namespaces', () => {
		const stub = vi.fn().mockResolvedValue('data');
		const runtime: ProxyRuntime = {
			bindMethod: vi.fn().mockReturnValue(stub),
		};

		const proxy = bindClient(
			namespace({
				a: namespace({
					b: namespace({
						c: method(),
					}),
				}),
			}),
			runtime,
		);

		expect(runtime.bindMethod).toHaveBeenCalledWith(['a', 'b', 'c']);
		const a = proxy.a as Record<string, unknown>;
		const b = a.b as Record<string, unknown>;
		expect(b.c).toBe(stub);
	});

	it('binds multiple descriptor kinds in one namespace', () => {
		const methodStub = vi.fn().mockResolvedValue(1);
		const notifStub = vi.fn().mockResolvedValue(undefined);
		const eventStub = async function* () {
			yield 1;
		};
		const runtime: ProxyRuntime = {
			bindMethod: vi.fn().mockReturnValue(methodStub),
			bindNotification: vi.fn().mockReturnValue(notifStub),
			bindEvent: vi.fn().mockReturnValue(eventStub),
		};

		const proxy = bindClient(
			namespace({
				get: method(),
				ping: notification(),
				logs: event(),
			}),
			runtime,
		);

		expect(proxy.get).toBe(methodStub);
		expect(proxy.ping).toBe(notifStub);
		expect(proxy.logs).toBe(eventStub);
	});
});
