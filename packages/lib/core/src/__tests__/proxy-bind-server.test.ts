import { describe, it, expect, vi } from 'vitest';
import {
	method,
	notification,
	event,
	namespace,
	resource,
	stream,
} from '../proxy/descriptors/factories/index.js';
import { bindServer } from '../proxy/bind/server/index.js';
import { UnsupportedDescriptorError } from '../proxy/bind/error.js';
import type { ServerRuntime } from '../proxy/runtime.js';
import type { ResourceFactory } from '../proxy/resource.js';
import type { EventHandler } from '../proxy/types.js';
import type { NotificationHandler } from '../proxy/types.js';
import type { MethodHandler } from '../proxy/types.js';

function createMockRuntime(
	overrides: Partial<ServerRuntime> = {},
): ServerRuntime {
	const self: ServerRuntime = {
		registerNamespace: vi
			.fn()
			.mockImplementation(() => createMockRuntime(overrides)),
		...overrides,
	};
	return self;
}

/**
 * Helper that mocks registerResource by capturing the factory and simulating
 * what a real runtime does: call factory(), bind the instance, track it.
 */
function createResourceMockRuntime(innerRuntime: ServerRuntime) {
	const instances = new Map<
		string,
		{ unbind: Array<() => void>; dispose(): Promise<void> }
	>();
	let capturedFactory: ResourceFactory | undefined;

	const spawnRuntime = createMockRuntime({
		registerResource: vi.fn().mockImplementation((factory: ResourceFactory) => {
			capturedFactory = factory;
			return async () => {
				await Promise.allSettled([...instances.keys()].map((id) => kill(id)));
			};
		}),
	});

	const connect = async (...args: unknown[]) => {
		const id = crypto.randomUUID();
		const instance = await capturedFactory!(...args);
		const unbind = instance.bind(innerRuntime);
		instances.set(id, { unbind, dispose: () => instance.dispose() });
		return id;
	};

	const kill = async (id: string) => {
		const entry = instances.get(id);
		if (!entry) return;
		instances.delete(id);
		for (const fn of entry.unbind) fn();
		await entry.dispose();
	};

	return {
		spawnRuntime,
		get factory() {
			return capturedFactory;
		},
		connect,
		kill,
	};
}

describe('bindServer', () => {
	it('registers a single method handler directly', async () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue(42);
		const runtime = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregister),
		});

		const binding = bindServer(method(), handler as never, runtime);

		expect(runtime.registerMethod).toHaveBeenCalledWith(expect.any(Function));
		const registered = (runtime.registerMethod as ReturnType<typeof vi.fn>).mock
			.calls[0]![1 - 1] as MethodHandler;
		expect(registered).not.toBe(handler);
		await expect(registered()).resolves.toBe(42);
		expect(typeof binding.dispose).toBe('function');
	});

	it('registers method handlers in a namespace', async () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue(42);
		const childRuntime = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregister),
		});
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(childRuntime),
		});

		bindServer(
			namespace({ add: method() }),
			{ add: handler } as never,
			runtime,
		);

		expect(runtime.registerNamespace).toHaveBeenCalledWith('add');
		expect(childRuntime.registerMethod).toHaveBeenCalledWith(
			expect.any(Function),
		);
		const registered = (childRuntime.registerMethod as ReturnType<typeof vi.fn>)
			.mock.calls[0]![0] as MethodHandler;
		await expect(registered()).resolves.toBe(42);
	});

	it('registers notification handlers', async () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue(undefined);
		const childRuntime = createMockRuntime({
			registerNotification: vi.fn().mockReturnValue(unregister),
		});
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(childRuntime),
		});

		bindServer(
			namespace({ ping: notification() }),
			{ ping: handler } as never,
			runtime,
		);

		expect(runtime.registerNamespace).toHaveBeenCalledWith('ping');
		expect(childRuntime.registerNotification).toHaveBeenCalledWith(
			expect.any(Function),
		);
		const registered = (
			childRuntime.registerNotification as ReturnType<typeof vi.fn>
		).mock.calls[0]![0] as NotificationHandler;
		await expect(registered()).resolves.toBeUndefined();
	});

	it('registers event handlers', () => {
		const unregister = vi.fn();
		const handler = async function* () {
			yield 1;
		};
		const childRuntime = createMockRuntime({
			registerEvent: vi.fn().mockReturnValue(unregister),
		});
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(childRuntime),
		});

		bindServer(
			namespace({ logs: event() }),
			{ logs: handler } as never,
			runtime,
		);

		expect(runtime.registerNamespace).toHaveBeenCalledWith('logs');
		expect(childRuntime.registerEvent).toHaveBeenCalledWith(
			expect.any(Function),
		);
		const registered = (childRuntime.registerEvent as ReturnType<typeof vi.fn>)
			.mock.calls[0]![0] as EventHandler;
		expect(registered()).toBeInstanceOf(Object);
	});

	it('recurses into namespace descriptors', async () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue(true);
		const existsRuntime = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregister),
		});
		const fsRuntime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(existsRuntime),
		});
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(fsRuntime),
		});

		bindServer(
			namespace({
				fs: namespace({
					exists: method(),
				}),
			}),
			{ fs: { exists: handler } } as never,
			runtime,
		);

		expect(runtime.registerNamespace).toHaveBeenCalledWith('fs');
		expect(fsRuntime.registerNamespace).toHaveBeenCalledWith('exists');
		expect(existsRuntime.registerMethod).toHaveBeenCalledWith(
			expect.any(Function),
		);
		const registered = (
			existsRuntime.registerMethod as ReturnType<typeof vi.fn>
		).mock.calls[0]![0] as MethodHandler;
		await expect(registered()).resolves.toBe(true);
	});

	it('registers resource(stream) via registerResource and defers inner binding to connect', async () => {
		const unregisterTransport = vi.fn();
		const innerRuntime = createMockRuntime({
			registerTransport: vi.fn().mockReturnValue(unregisterTransport),
		});
		const mock = createResourceMockRuntime(innerRuntime);
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(mock.spawnRuntime),
		});

		const transportValue = { readable: 'r', writable: 'w', close: vi.fn() };
		const factory = vi.fn().mockResolvedValue(transportValue);

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		expect(runtime.registerNamespace).toHaveBeenCalledWith('spawn');
		expect(mock.spawnRuntime.registerResource).toHaveBeenCalledWith(
			expect.any(Function),
		);

		// Inner stream is NOT registered yet (deferred)
		expect(innerRuntime.registerTransport).not.toHaveBeenCalled();

		// On connect, inner binding fires
		const id = await mock.connect('arg1');
		expect(factory).toHaveBeenCalledWith('arg1');
		expect(typeof id).toBe('string');
		expect(innerRuntime.registerTransport).toHaveBeenCalledWith(transportValue);
	});

	it('registers resource(namespace) and defers inner method binding to connect', async () => {
		const unregisterMethod = vi.fn();
		const innerMethodRuntime = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregisterMethod),
		});
		const innerRuntime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(innerMethodRuntime),
		});
		const mock = createResourceMockRuntime(innerRuntime);
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(mock.spawnRuntime),
		});

		const resourceValue = { data: 42 };
		const doThingHandler = vi.fn().mockResolvedValue(resourceValue);

		bindServer(
			namespace({ handle: resource(namespace({ doThing: method() })) }),
			{
				handle: vi.fn().mockResolvedValue({ doThing: doThingHandler }),
			} as never,
			runtime,
		);

		expect(runtime.registerNamespace).toHaveBeenCalledWith('handle');
		expect(mock.spawnRuntime.registerResource).toHaveBeenCalledWith(
			expect.any(Function),
		);

		// Inner methods are NOT registered yet
		expect(innerRuntime.registerNamespace).not.toHaveBeenCalled();

		// On connect, inner binding fires
		const id = await mock.connect();
		expect(typeof id).toBe('string');
		expect(innerRuntime.registerNamespace).toHaveBeenCalledWith('doThing');
		expect(innerMethodRuntime.registerMethod).toHaveBeenCalledWith(
			expect.any(Function),
		);

		// Inner method handler resolves against the leased instance
		const registered = (
			innerMethodRuntime.registerMethod as ReturnType<typeof vi.fn>
		).mock.calls[0]![0] as MethodHandler;
		await expect(registered()).resolves.toBe(resourceValue);
	});

	it('resource lifecycle kills instances and calls dispose', async () => {
		const dispose = vi.fn();
		const factory = vi.fn().mockResolvedValue({ dispose });

		const innerRuntime = createMockRuntime({
			registerTransport: vi.fn().mockReturnValue(vi.fn()),
		});
		const mock = createResourceMockRuntime(innerRuntime);
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(mock.spawnRuntime),
		});

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		const id = await mock.connect();
		await mock.kill(id);
		expect(dispose).toHaveBeenCalledOnce();
	});

	it('resource lifecycle closes stream-like instances without dispose', async () => {
		const close = vi.fn();
		const factory = vi.fn().mockResolvedValue({
			readable: 'r',
			writable: 'w',
			close,
		});

		const innerRuntime = createMockRuntime({
			registerTransport: vi.fn().mockReturnValue(vi.fn()),
		});
		const mock = createResourceMockRuntime(innerRuntime);
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(mock.spawnRuntime),
		});

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		const id = await mock.connect();
		await mock.kill(id);
		expect(close).toHaveBeenCalledOnce();
	});

	it('resource kill unregisters inner bindings', async () => {
		const innerUnregister = vi.fn();
		const factory = vi.fn().mockResolvedValue({ readable: 'r', writable: 'w' });

		const innerRuntime = createMockRuntime({
			registerTransport: vi.fn().mockReturnValue(innerUnregister),
		});
		const mock = createResourceMockRuntime(innerRuntime);
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(mock.spawnRuntime),
		});

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		const id = await mock.connect();
		expect(innerUnregister).not.toHaveBeenCalled();

		await mock.kill(id);
		expect(innerUnregister).toHaveBeenCalledOnce();
	});

	it('dispose calls all unregister functions', () => {
		const unregister1 = vi.fn();
		const unregister2 = vi.fn();
		let callCount = 0;
		const aRuntime = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregister1),
		});
		const bRuntime = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregister2),
		});
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockImplementation(() => {
				return callCount++ === 0 ? aRuntime : bRuntime;
			}),
		});

		const binding = bindServer(
			namespace({
				a: method(),
				b: method(),
			}),
			{
				a: vi.fn().mockResolvedValue(1),
				b: vi.fn().mockResolvedValue(2),
			} as never,
			runtime,
		);

		expect(unregister1).not.toHaveBeenCalled();
		expect(unregister2).not.toHaveBeenCalled();

		void binding.dispose();

		expect(unregister1).toHaveBeenCalledOnce();
		expect(unregister2).toHaveBeenCalledOnce();
	});

	it('throws UnsupportedDescriptorError when runtime lacks method', () => {
		const runtime = createMockRuntime();

		expect(() => bindServer(method(), vi.fn() as never, runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('handles deeply nested namespaces', async () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue('data');
		const cRuntime = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregister),
		});
		const bRuntime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(cRuntime),
		});
		const aRuntime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(bRuntime),
		});
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(aRuntime),
		});

		bindServer(
			namespace({
				a: namespace({
					b: namespace({
						c: method(),
					}),
				}),
			}),
			{ a: { b: { c: handler } } } as never,
			runtime,
		);

		expect(runtime.registerNamespace).toHaveBeenCalledWith('a');
		expect(aRuntime.registerNamespace).toHaveBeenCalledWith('b');
		expect(bRuntime.registerNamespace).toHaveBeenCalledWith('c');
		expect(cRuntime.registerMethod).toHaveBeenCalledWith(expect.any(Function));
		const registered = (cRuntime.registerMethod as ReturnType<typeof vi.fn>)
			.mock.calls[0]![0] as MethodHandler;
		await expect(registered()).resolves.toBe('data');
	});

	it('preserves this-binding for class-based implementations', async () => {
		class Counter {
			private count = 0;
			async increment() {
				this.count++;
				return this.count;
			}
		}

		const counter = new Counter();
		const unregister = vi.fn();
		const childRuntime = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregister),
		});
		const runtime = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(childRuntime),
		});

		bindServer(
			namespace({ increment: method() }),
			{ increment: counter.increment } as never,
			// Note: this-binding comes from the namespace object, not the class
			runtime,
		);

		// Hmm, actually we need to test with the counter AS the namespace value
		// Let's redo: bind at the namespace level with counter as impl
		const childRuntime2 = createMockRuntime({
			registerMethod: vi.fn().mockReturnValue(unregister),
		});
		const runtime2 = createMockRuntime({
			registerNamespace: vi.fn().mockReturnValue(childRuntime2),
		});

		bindServer(namespace({ increment: method() }), counter as never, runtime2);

		const registered = (
			childRuntime2.registerMethod as ReturnType<typeof vi.fn>
		).mock.calls[0]![0] as MethodHandler;
		// this-binding should be the counter (parent = counter)
		await expect(registered()).resolves.toBe(1);
		await expect(registered()).resolves.toBe(2);
	});
});
