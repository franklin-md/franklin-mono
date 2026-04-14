import { describe, it, expect, vi } from 'vitest';
import {
	method,
	notification,
	event,
	on,
	namespace,
	resource,
	stream,
} from '../proxy/descriptors/factories/index.js';
import { bindClient } from '../proxy/bind/client/index.js';
import { UnsupportedDescriptorError } from '../proxy/bind/error.js';
import type { ProxyRuntime } from '../proxy/runtime.js';

function createMockRuntime(
	overrides: Partial<ProxyRuntime> = {},
): ProxyRuntime {
	return {
		bindNamespace: vi
			.fn()
			.mockImplementation(() => createMockRuntime(overrides)),
		...overrides,
	};
}

describe('bindClient', () => {
	it('binds a single method descriptor directly', () => {
		const stub = vi.fn().mockResolvedValue(42);
		const runtime = createMockRuntime({
			bindMethod: vi.fn().mockReturnValue(stub),
		});

		const result = bindClient(method(), runtime);

		expect(runtime.bindMethod).toHaveBeenCalled();
		expect(result).toBe(stub);
	});

	it('binds a namespace with method members', () => {
		const stub = vi.fn().mockResolvedValue(42);
		const childRuntime = createMockRuntime({
			bindMethod: vi.fn().mockReturnValue(stub),
		});
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(childRuntime),
		});

		const proxy = bindClient(namespace({ add: method() }), runtime);

		expect(runtime.bindNamespace).toHaveBeenCalledWith('add');
		expect(childRuntime.bindMethod).toHaveBeenCalled();
		expect(proxy.add).toBe(stub);
	});

	it('binds notification descriptors via runtime.bindNotification', () => {
		const stub = vi.fn().mockResolvedValue(undefined);
		const childRuntime = createMockRuntime({
			bindNotification: vi.fn().mockReturnValue(stub),
		});
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(childRuntime),
		});

		const proxy = bindClient(namespace({ ping: notification() }), runtime);

		expect(runtime.bindNamespace).toHaveBeenCalledWith('ping');
		expect(childRuntime.bindNotification).toHaveBeenCalled();
		expect(proxy.ping).toBe(stub);
	});

	it('binds event descriptors via runtime.bindEvent', () => {
		const stub = async function* () {
			yield 1;
		};
		const childRuntime = createMockRuntime({
			bindEvent: vi.fn().mockReturnValue(stub),
		});
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(childRuntime),
		});

		const proxy = bindClient(namespace({ logs: event() }), runtime);

		expect(runtime.bindNamespace).toHaveBeenCalledWith('logs');
		expect(childRuntime.bindEvent).toHaveBeenCalled();
		expect(proxy.logs).toBe(stub);
	});

	it('binds on descriptors via runtime.bindOn', () => {
		const stub = vi.fn().mockReturnValue(() => {});
		const childRuntime = createMockRuntime({
			bindOn: vi.fn().mockReturnValue(stub),
		});
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(childRuntime),
		});

		const proxy = bindClient(namespace({ status: on() }), runtime);

		expect(runtime.bindNamespace).toHaveBeenCalledWith('status');
		expect(childRuntime.bindOn).toHaveBeenCalled();
		expect(proxy.status).toBe(stub);
	});

	it('recurses into namespace descriptors', () => {
		const stub = vi.fn().mockResolvedValue(true);
		const existsRuntime = createMockRuntime({
			bindMethod: vi.fn().mockReturnValue(stub),
		});
		const fsRuntime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(existsRuntime),
		});
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(fsRuntime),
		});

		const proxy = bindClient(
			namespace({
				fs: namespace({
					exists: method(),
				}),
			}),
			runtime,
		);

		expect(runtime.bindNamespace).toHaveBeenCalledWith('fs');
		expect(fsRuntime.bindNamespace).toHaveBeenCalledWith('exists');
		expect(existsRuntime.bindMethod).toHaveBeenCalled();
		expect((proxy.fs as Record<string, unknown>).exists).toBe(stub);
	});

	it('binds resource(stream) by calling bindResource and recursing into inner', async () => {
		const streamValue = { readable: 'r', writable: 'w', close: vi.fn() };
		const dispose = vi.fn().mockResolvedValue(undefined);
		const resourceInnerRuntime = createMockRuntime({
			bindTransport: vi.fn().mockReturnValue(streamValue),
		});
		const binding = vi
			.fn()
			.mockResolvedValue(Object.assign(resourceInnerRuntime, { dispose }));
		const spawnRuntime = createMockRuntime({
			bindResource: vi.fn().mockReturnValue(binding),
		});
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(spawnRuntime),
		});

		const proxy = bindClient(
			namespace({ spawn: resource<[string]>(stream()) }),
			runtime,
		);

		expect(runtime.bindNamespace).toHaveBeenCalledWith('spawn');
		expect(spawnRuntime.bindResource).toHaveBeenCalled();
		expect(typeof proxy.spawn).toBe('function');

		const instance = await (
			proxy.spawn as (...args: unknown[]) => Promise<unknown>
		)('arg1');
		expect(binding).toHaveBeenCalledWith('arg1');
		expect(resourceInnerRuntime.bindTransport).toHaveBeenCalled();
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
		const dispose = vi.fn().mockResolvedValue(undefined);
		const doThingRuntime = createMockRuntime({
			bindMethod: vi.fn().mockReturnValue(methodStub),
		});
		const resourceInnerRuntime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(doThingRuntime),
		});
		const binding = vi
			.fn()
			.mockResolvedValue(Object.assign(resourceInnerRuntime, { dispose }));
		const handleRuntime = createMockRuntime({
			bindResource: vi.fn().mockReturnValue(binding),
		});
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(handleRuntime),
		});

		const proxy = bindClient(
			namespace({ handle: resource(namespace({ doThing: method() })) }),
			runtime,
		);

		expect(runtime.bindNamespace).toHaveBeenCalledWith('handle');
		expect(handleRuntime.bindResource).toHaveBeenCalled();

		const instance = (await (
			proxy.handle as (...args: unknown[]) => Promise<unknown>
		)()) as Record<string, unknown>;
		expect(binding).toHaveBeenCalledWith();
		expect(resourceInnerRuntime.bindNamespace).toHaveBeenCalledWith('doThing');
		expect(doThingRuntime.bindMethod).toHaveBeenCalled();
		expect(instance.doThing).toBe(methodStub);
		expect(typeof instance.dispose).toBe('function');
	});

	it('dispose on resource calls handle dispose', async () => {
		const dispose = vi.fn().mockResolvedValue(undefined);
		const resourceInnerRuntime = createMockRuntime({
			bindTransport: vi
				.fn()
				.mockReturnValue({ readable: 'r', writable: 'w', close: vi.fn() }),
		});
		const binding = vi
			.fn()
			.mockResolvedValue(Object.assign(resourceInnerRuntime, { dispose }));
		const runtime = createMockRuntime({
			bindResource: vi.fn().mockReturnValue(binding),
		});

		const factory = bindClient(resource(stream()), runtime) as (
			...args: unknown[]
		) => Promise<Record<string, unknown>>;
		const instance = await factory();
		await (instance.dispose as () => Promise<void>)();
		expect(dispose).toHaveBeenCalledOnce();
	});

	it('throws UnsupportedDescriptorError when runtime lacks method', () => {
		const runtime = createMockRuntime();

		expect(() => bindClient(method(), runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('throws UnsupportedDescriptorError for unsupported notification', () => {
		const runtime = createMockRuntime();

		expect(() => bindClient(notification(), runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('throws UnsupportedDescriptorError for unsupported event', () => {
		const runtime = createMockRuntime();

		expect(() => bindClient(event(), runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('throws UnsupportedDescriptorError for unsupported on', () => {
		const runtime = createMockRuntime();

		expect(() => bindClient(on(), runtime)).toThrow(UnsupportedDescriptorError);
	});

	it('throws UnsupportedDescriptorError for unsupported resource', () => {
		const runtime = createMockRuntime();

		expect(() => bindClient(resource(stream()), runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('handles deeply nested namespaces', () => {
		const stub = vi.fn().mockResolvedValue('data');
		const cRuntime = createMockRuntime({
			bindMethod: vi.fn().mockReturnValue(stub),
		});
		const bRuntime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(cRuntime),
		});
		const aRuntime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(bRuntime),
		});
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockReturnValue(aRuntime),
		});

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

		expect(runtime.bindNamespace).toHaveBeenCalledWith('a');
		expect(aRuntime.bindNamespace).toHaveBeenCalledWith('b');
		expect(bRuntime.bindNamespace).toHaveBeenCalledWith('c');
		expect(cRuntime.bindMethod).toHaveBeenCalled();
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
		const getRuntime = createMockRuntime({
			bindMethod: vi.fn().mockReturnValue(methodStub),
		});
		const pingRuntime = createMockRuntime({
			bindNotification: vi.fn().mockReturnValue(notifStub),
		});
		const logsRuntime = createMockRuntime({
			bindEvent: vi.fn().mockReturnValue(eventStub),
		});
		let nsCount = 0;
		const runtime = createMockRuntime({
			bindNamespace: vi.fn().mockImplementation(() => {
				return [getRuntime, pingRuntime, logsRuntime][nsCount++];
			}),
		});

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
