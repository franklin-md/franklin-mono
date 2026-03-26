import { describe, it, expect, vi } from 'vitest';
import {
	method,
	notification,
	event,
	namespace,
	resource,
	stream,
} from '../proxy/descriptors/factories.js';
import { bindServer } from '../proxy/bind-server.js';
import { UnsupportedDescriptorError } from '../proxy/bind-client.js';
import type { ServerRuntime } from '../proxy/runtime.js';

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

	it('registers resource handlers', () => {
		const unregisters = [vi.fn(), vi.fn()];
		const factory = vi.fn().mockResolvedValue({});
		const runtime: ServerRuntime = {
			registerResource: vi.fn().mockReturnValue(unregisters),
		};

		bindServer(
			namespace({ spawn: resource(stream()) }),
			{ spawn: factory } as never,
			runtime,
		);

		expect(runtime.registerResource).toHaveBeenCalledWith(
			['spawn'],
			expect.objectContaining({ kind: expect.any(Symbol) }),
			factory,
		);
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

		binding.dispose();

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
