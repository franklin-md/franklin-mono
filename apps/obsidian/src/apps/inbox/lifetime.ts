import type { AbsolutePath } from '@franklin/lib';
import type { App } from 'obsidian';
import { InboxController } from './controller/index.js';
import type { InboxControllerOptions } from './controller/types.js';

export type InboxLifetime = {
	ready: Promise<InboxController>;
	dispose: () => Promise<void>;
};

// Obsidian keeps its App when it reloads a plugin bundle. Store handoffs there
// so a fresh module instance can still wait for the previous writer.
const lifetimeKey = Symbol.for('franklin.study-inbox.lifetimes');
type InboxHost = App & { [lifetimeKey]?: Map<AbsolutePath, InboxLifetime> };

export function openInbox(
	app: App,
	path: AbsolutePath,
	options: InboxControllerOptions,
): InboxLifetime {
	const owners = ((app as InboxHost)[lifetimeKey] ??= new Map<
		AbsolutePath,
		InboxLifetime
	>());
	const previous = owners.get(path);
	const abort = new AbortController();
	const ready = (async () => {
		// Even a failed shutdown has finished all writes before the next load.
		await previous?.dispose().catch(() => {});
		return InboxController.create(options, abort.signal);
	})();
	let shutdown: Promise<void> | undefined;
	const lifetime: InboxLifetime = {
		ready,
		dispose() {
			abort.abort();
			return (shutdown ??= ready
				.then(
					(inbox) => inbox.dispose(),
					() => {}, // Startup errors belong to the ready promise.
				)
				.finally(() => {
					if (owners.get(path) === lifetime) owners.delete(path);
				}));
		},
	};
	owners.set(path, lifetime);
	return lifetime;
}
