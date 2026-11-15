import type { AbsolutePath } from '@franklin/lib';
import type { App } from 'obsidian';
import type { InboxController } from './controller/controller.js';

export type InboxLifetime = {
	ready: Promise<InboxController>;
	dispose: (beforeClose?: Promise<void>) => Promise<void>;
};

// Obsidian keeps its App when it reloads a plugin bundle. Store handoffs there
// so a fresh module instance can still wait for the previous writer.
const lifetimeKey = Symbol.for('franklin.study-inbox.lifetimes');
type InboxHost = App & { [lifetimeKey]?: Map<AbsolutePath, InboxLifetime> };

export function openInbox(
	app: App,
	path: AbsolutePath,
	create: (signal: AbortSignal) => Promise<InboxController>,
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
		abort.signal.throwIfAborted();
		return create(abort.signal);
	})();
	let shutdown: Promise<void> | undefined;
	const lifetime: InboxLifetime = {
		ready,
		dispose(beforeClose) {
			abort.abort();
			return (shutdown ??= ready
				.catch(() => undefined) // Startup errors belong to the ready promise.
				.then(async (inbox) => {
					try {
						await beforeClose;
					} finally {
						await inbox?.dispose();
					}
				})
				.finally(() => {
					if (owners.get(path) === lifetime) owners.delete(path);
				}));
		},
	};
	owners.set(path, lifetime);
	return lifetime;
}
