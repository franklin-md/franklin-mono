import { describe, it, expect, vi } from 'vitest';
import {
	method,
	notification,
	event,
	namespace,
	resource,
	stream,
} from '../proxy/descriptors/factories.js';
import {
	bindClient,
	UnsupportedDescriptorError,
} from '../proxy/bind-client.js';
import type { ProxyRuntime } from '../proxy/runtime.js';

describe('bindClient', () => {
	it('binds a single method descriptor directly', () => {
		const stub = vi.fn().mockResolvedValue(42);
		const runtime: ProxyRuntime = {
			bindMethod: vi.fn().mockReturnValue(stub),
		};

		const result = bindClient(method(), runtime);

		expect(runtime.bindMethod).toHaveBeenCalledWith(
			[],
			expect.objectContaining({ kind: expect.any(Symbol) }),
		);
		expect(result).toBe(stub);
	});

	it('binds a namespace with method members', () => {
		const stub = vi.fn().mockResolvedValue(42);
		const runtime: ProxyRuntime = {
			bindMethod: vi.fn().mockReturnValue(stub),
		};

		const proxy = bindClient(namespace({ add: method() }), runtime);

		expect(runtime.bindMethod).toHaveBeenCalledWith(
			['add'],
			expect.objectContaining({ kind: expect.any(Symbol) }),
		);
		expect(proxy.add).toBe(stub);
	});

	it('binds notification descriptors via runtime.bindNotification', () => {
		const stub = vi.fn().mockResolvedValue(undefined);
		const runtime: ProxyRuntime = {
			bindNotification: vi.fn().mockReturnValue(stub),
		};

		const proxy = bindClient(namespace({ ping: notification() }), runtime);

		expect(runtime.bindNotification).toHaveBeenCalledWith(
			['ping'],
			expect.objectContaining({ kind: expect.any(Symbol) }),
		);
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

		expect(runtime.bindEvent).toHaveBeenCalledWith(
			['logs'],
			expect.objectContaining({ kind: expect.any(Symbol) }),
		);
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

		expect(runtime.bindMethod).toHaveBeenCalledWith(
			['fs', 'exists'],
			expect.objectContaining({ kind: expect.any(Symbol) }),
		);
		expect((proxy.fs as Record<string, unknown>).exists).toBe(stub);
	});

	it('binds resource descriptors via runtime.bindResource', () => {
		const innerProxy = { doThing: vi.fn() };
		const factory = vi.fn().mockResolvedValue(innerProxy);
		const runtime: ProxyRuntime = {
			bindResource: vi.fn().mockReturnValue(factory),
		};

		const proxy = bindClient(
			namespace({
				spawn: resource(stream()),
			}),
			runtime,
		);

		expect(runtime.bindResource).toHaveBeenCalledWith(
			['spawn'],
			expect.objectContaining({ kind: expect.any(Symbol) }),
		);
		expect(proxy.spawn).toBe(factory);
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

		expect(runtime.bindMethod).toHaveBeenCalledWith(
			['a', 'b', 'c'],
			expect.any(Object),
		);
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
