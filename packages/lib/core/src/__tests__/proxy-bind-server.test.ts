import { describe, it, expect, vi } from 'vitest';
import {
	method,
	notification,
	event,
	namespace,
	resource,
	stream,
} from '../proxy/descriptors/factories/index.js';
import { bindServer } from '../proxy/bind/server.js';
import { UnsupportedDescriptorError } from '../proxy/bind/client.js';
import type { ResourceHandle, ServerRuntime } from '../proxy/runtime.js';

describe('bindServer', () => {
	it('registers a single method handler directly', () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue(42);
		const runtime: ServerRuntime = {
			registerMethod: vi.fn().mockReturnValue(unregister),
		};

		const binding = bindServer(method(), handler as never, runtime);

		expect(runtime.registerMethod).toHaveBeenCalledWith([], handler);
		expect(typeof binding.dispose).toBe('function');
	});

	it('registers method handlers in a namespace', () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue(42);
		const runtime: ServerRuntime = {
			registerMethod: vi.fn().mockReturnValue(unregister),
		};

		bindServer(
			namespace({ add: method() }),
			{ add: handler } as never,
			runtime,
		);

		expect(runtime.registerMethod).toHaveBeenCalledWith(['add'], handler);
	});

	it('registers notification handlers', () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue(undefined);
		const runtime: ServerRuntime = {
			registerNotification: vi.fn().mockReturnValue(unregister),
		};

		bindServer(
			namespace({ ping: notification() }),
			{ ping: handler } as never,
			runtime,
		);

		expect(runtime.registerNotification).toHaveBeenCalledWith(
			['ping'],
			handler,
		);
	});

	it('registers event handlers', () => {
		const unregister = vi.fn();
		const handler = async function* () {
			yield 1;
		};
		const runtime: ServerRuntime = {
			registerEvent: vi.fn().mockReturnValue(unregister),
		};

		bindServer(
			namespace({ logs: event() }),
			{ logs: handler } as never,
			runtime,
		);

		expect(runtime.registerEvent).toHaveBeenCalledWith(['logs'], handler);
	});

	it('recurses into namespace descriptors', () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue(true);
		const runtime: ServerRuntime = {
			registerMethod: vi.fn().mockReturnValue(unregister),
		};

		bindServer(
			namespace({
				fs: namespace({
					exists: method(),
				}),
			}),
			{ fs: { exists: handler } } as never,
			runtime,
		);

		expect(runtime.registerMethod).toHaveBeenCalledWith(
			['fs', 'exists'],
			handler,
		);
	});

	it('registers resource(stream) via registerResource and recurses into inner', () => {
		const unregisterStream = vi.fn();
		const unregisterResource = vi.fn();
		const resourceRuntime: ServerRuntime = {
			registerStream: vi.fn().mockReturnValue(unregisterStream),
		};
		const runtime: ServerRuntime = {
			registerResource: vi.fn().mockReturnValue({
				unregister: [unregisterResource],
				inner: vi.fn().mockReturnValue(resourceRuntime),
			}),
		};

		const factory = vi.fn().mockResolvedValue({});

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		// registerResource receives a ResourceHandle, not the raw factory
		expect(runtime.registerResource).toHaveBeenCalledWith(
			['spawn'],
			expect.objectContaining({
				connect: expect.any(Function),
				kill: expect.any(Function),
				get: expect.any(Function),
				onConnect: expect.any(Function),
			}),
		);
		const binding = (runtime.registerResource as ReturnType<typeof vi.fn>).mock
			.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
		expect(binding.inner).toHaveBeenCalled();
		// The inner descriptor (stream) should be registered on the resource runtime
		// without a handler -- the resource runtime dispatches internally
		expect(resourceRuntime.registerStream).toHaveBeenCalledWith([], undefined);
	});

	it('registers resource(namespace) via registerResource and recurses into inner members', () => {
		const unregisterMethod = vi.fn();
		const unregisterResource = vi.fn();
		const resourceRuntime: ServerRuntime = {
			registerMethod: vi.fn().mockReturnValue(unregisterMethod),
		};
		const runtime: ServerRuntime = {
			registerResource: vi.fn().mockReturnValue({
				unregister: [unregisterResource],
				inner: vi.fn().mockReturnValue(resourceRuntime),
			}),
		};

		const doThingHandler = vi.fn().mockResolvedValue(42);

		bindServer(
			namespace({ handle: resource(namespace({ doThing: method() })) }),
			{ handle: doThingHandler } as never,
			runtime,
		);

		// registerResource receives a ResourceHandle, not the raw factory
		expect(runtime.registerResource).toHaveBeenCalledWith(
			['handle'],
			expect.objectContaining({
				connect: expect.any(Function),
				kill: expect.any(Function),
				get: expect.any(Function),
				onConnect: expect.any(Function),
			}),
		);
		const binding = (runtime.registerResource as ReturnType<typeof vi.fn>).mock
			.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
		expect(binding.inner).toHaveBeenCalled();
		// The inner method should be registered on the resource runtime
		// without a handler -- the resource runtime dispatches to instances
		expect(resourceRuntime.registerMethod).toHaveBeenCalledWith(
			['doThing'],
			undefined,
		);
	});

	it('resource handle delegates to the underlying factory on connect', async () => {
		const resourceValue = { data: 42 };
		const factory = vi.fn().mockResolvedValue(resourceValue);
		let capturedHandle: ResourceHandle | undefined;

		const resourceRuntime: ServerRuntime = {
			registerStream: vi.fn().mockReturnValue(vi.fn()),
		};
		const runtime: ServerRuntime = {
			registerResource: vi.fn().mockImplementation((_path, handle) => {
				capturedHandle = handle as ResourceHandle;
				return {
					unregister: [],
					inner: vi.fn().mockReturnValue(resourceRuntime),
				};
			}),
		};

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		expect(capturedHandle).toBeDefined();
		const id = await capturedHandle!.connect('arg1', 'arg2');
		expect(factory).toHaveBeenCalledWith('arg1', 'arg2');
		expect(typeof id).toBe('string');
		expect(capturedHandle!.get(id)).toBe(resourceValue);
	});

	it('resource handle fires onConnect hooks', async () => {
		const resourceValue = { data: 42 };
		const factory = vi.fn().mockResolvedValue(resourceValue);
		let capturedHandle: ResourceHandle | undefined;

		const resourceRuntime: ServerRuntime = {
			registerStream: vi.fn().mockReturnValue(vi.fn()),
		};
		const runtime: ServerRuntime = {
			registerResource: vi.fn().mockImplementation((_path, handle) => {
				capturedHandle = handle as ResourceHandle;
				return {
					unregister: [],
					inner: vi.fn().mockReturnValue(resourceRuntime),
				};
			}),
		};

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		const hook = vi.fn();
		capturedHandle!.onConnect(hook);
		const id = await capturedHandle!.connect();
		expect(hook).toHaveBeenCalledWith(id, resourceValue);
	});

	it('resource handle kills instances and calls dispose', async () => {
		const dispose = vi.fn();
		const factory = vi.fn().mockResolvedValue({ dispose });
		let capturedHandle: ResourceHandle | undefined;

		const resourceRuntime: ServerRuntime = {
			registerStream: vi.fn().mockReturnValue(vi.fn()),
		};
		const runtime: ServerRuntime = {
			registerResource: vi.fn().mockImplementation((_path, handle) => {
				capturedHandle = handle as ResourceHandle;
				return {
					unregister: [],
					inner: vi.fn().mockReturnValue(resourceRuntime),
				};
			}),
		};

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		const id = await capturedHandle!.connect();
		await capturedHandle!.kill(id);
		expect(dispose).toHaveBeenCalledOnce();
	});

	it('dispose calls all unregister functions', () => {
		const unregister1 = vi.fn();
		const unregister2 = vi.fn();
		let callCount = 0;
		const runtime: ServerRuntime = {
			registerMethod: vi.fn().mockImplementation(() => {
				return callCount++ === 0 ? unregister1 : unregister2;
			}),
		};

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
		const runtime: ServerRuntime = {};

		expect(() => bindServer(method(), vi.fn() as never, runtime)).toThrow(
			UnsupportedDescriptorError,
		);
	});

	it('handles deeply nested namespaces', () => {
		const unregister = vi.fn();
		const handler = vi.fn().mockResolvedValue('data');
		const runtime: ServerRuntime = {
			registerMethod: vi.fn().mockReturnValue(unregister),
		};

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

		expect(runtime.registerMethod).toHaveBeenCalledWith(
			['a', 'b', 'c'],
			handler,
		);
	});
});
