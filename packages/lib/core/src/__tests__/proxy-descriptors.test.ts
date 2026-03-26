import { describe, it, expect } from 'vitest';
import {
	method,
	notification,
	event,
	stream,
	namespace,
	resource,
	transport,
	handle,
} from '../proxy/descriptors/factories.js';
import {
	isMethodDescriptor,
	isNotificationDescriptor,
	isEventDescriptor,
	isStreamDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
	isTransportDescriptor,
	isHandleDescriptor,
} from '../proxy/descriptors/detect.js';
import {
	METHOD_KIND,
	NOTIFICATION_KIND,
	EVENT_KIND,
	STREAM_KIND,
	NAMESPACE_KIND,
	RESOURCE_KIND,
} from '../proxy/descriptors/types.js';

describe('descriptor factories', () => {
	it('method() creates a MethodDescriptor', () => {
		const d = method();
		expect(d.kind).toBe(METHOD_KIND);
	});

	it('notification() creates a NotificationDescriptor', () => {
		const d = notification();
		expect(d.kind).toBe(NOTIFICATION_KIND);
	});

	it('event() creates an EventDescriptor', () => {
		const d = event();
		expect(d.kind).toBe(EVENT_KIND);
	});

	it('stream() creates a StreamDescriptor', () => {
		const d = stream();
		expect(d.kind).toBe(STREAM_KIND);
	});

	it('namespace() creates a NamespaceDescriptor with shape', () => {
		const d = namespace({ foo: method() });
		expect(d.kind).toBe(NAMESPACE_KIND);
		expect(d.shape).toHaveProperty('foo');
		expect(d.shape.foo.kind).toBe(METHOD_KIND);
	});

	it('resource() creates a ResourceDescriptor with inner', () => {
		const inner = stream();
		const d = resource(inner);
		expect(d.kind).toBe(RESOURCE_KIND);
		expect(d.inner).toBe(inner);
	});

	it('transport() creates a ResourceDescriptor<StreamDescriptor>', () => {
		const d = transport();
		expect(d.kind).toBe(RESOURCE_KIND);
		expect(d.inner.kind).toBe(STREAM_KIND);
	});

	it('handle() creates a ResourceDescriptor<NamespaceDescriptor>', () => {
		const d = handle({ foo: method() });
		expect(d.kind).toBe(RESOURCE_KIND);
		expect(d.inner.kind).toBe(NAMESPACE_KIND);
	});
});

describe('descriptor type guards', () => {
	it('isMethodDescriptor', () => {
		expect(isMethodDescriptor(method())).toBe(true);
		expect(isMethodDescriptor(notification())).toBe(false);
		expect(isMethodDescriptor(null)).toBe(false);
	});

	it('isNotificationDescriptor', () => {
		expect(isNotificationDescriptor(notification())).toBe(true);
		expect(isNotificationDescriptor(method())).toBe(false);
	});

	it('isEventDescriptor', () => {
		expect(isEventDescriptor(event())).toBe(true);
		expect(isEventDescriptor(method())).toBe(false);
	});

	it('isStreamDescriptor', () => {
		expect(isStreamDescriptor(stream())).toBe(true);
		expect(isStreamDescriptor(method())).toBe(false);
	});

	it('isNamespaceDescriptor', () => {
		expect(isNamespaceDescriptor(namespace({}))).toBe(true);
		expect(isNamespaceDescriptor(method())).toBe(false);
	});

	it('isResourceDescriptor', () => {
		expect(isResourceDescriptor(resource(stream()))).toBe(true);
		expect(isResourceDescriptor(method())).toBe(false);
	});

	it('isTransportDescriptor', () => {
		expect(isTransportDescriptor(transport())).toBe(true);
		expect(isTransportDescriptor(handle({}))).toBe(false);
		expect(isTransportDescriptor(method())).toBe(false);
	});

	it('isHandleDescriptor', () => {
		expect(isHandleDescriptor(handle({ foo: method() }))).toBe(true);
		expect(isHandleDescriptor(transport())).toBe(false);
		expect(isHandleDescriptor(method())).toBe(false);
	});

	it('rejects non-objects', () => {
		expect(isMethodDescriptor(undefined)).toBe(false);
		expect(isMethodDescriptor('string')).toBe(false);
		expect(isMethodDescriptor(42)).toBe(false);
	});
});
