import type { ProxyRuntime, ServerRuntime } from './runtime.js';

/**
 * Client-side: returned by ProxyRuntime.bindResource().
 * A factory that creates a resource instance — returns the inner proxy runtime
 * plus a dispose that sends the kill signal to the server.
 */
export type ResourceBinding = (
	...args: unknown[]
) => Promise<ProxyRuntime & { dispose(): Promise<void> }>;

/**
 * Server-side: passed to ServerRuntime.registerResource().
 * A factory that creates resource instances on the server.
 */
export type ResourceFactory = (...args: unknown[]) => Promise<ResourceInstance>;

/**
 * A single resource instance on the server.
 * `bind` wires the instance's inner descriptors onto a runtime.
 * `dispose` tears down user resources (always present — ProxyType = ImplType).
 */
export interface ResourceInstance {
	bind(runtime: ServerRuntime): Array<() => void>;
	dispose(): Promise<void>;
}
