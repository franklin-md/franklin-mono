import type { API } from '../api/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { Extension, ExtensionFor, ExtensionInput } from './types.js';

export function createExtension<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
>(): (
	extension: ExtensionInput<APIs, Runtimes>,
) => ExtensionFor<APIs, Runtimes>;

export function createExtension<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
>(extension: ExtensionInput<APIs, Runtimes>): ExtensionFor<APIs, Runtimes>;

export function createExtension(extension?: Extension<never>): unknown {
	if (extension !== undefined) return extension;
	return (next: Extension<never>) => next;
}
