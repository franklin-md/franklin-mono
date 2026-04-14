/* eslint-disable @typescript-eslint/no-dynamic-delete */

import { createObserver } from '@franklin/lib';
import type { Filesystem } from '@franklin/lib';

import type { AuthEntries, AuthEntry } from './types.js';

// ---------------------------------------------------------------------------
// Default location
// ---------------------------------------------------------------------------

const DEFAULT_AUTH_PATH = 'auth.json';

// ---------------------------------------------------------------------------
// AuthEntriesStore (in-memory)
// ---------------------------------------------------------------------------

export class AuthEntriesStore {
	private readonly data: Record<string, AuthEntry> = {};
	private readonly observer = createObserver<[string, AuthEntry | undefined]>();

	get(provider: string): AuthEntry | undefined {
		return this.data[provider];
	}

	set(provider: string, entry: AuthEntry): void {
		this.data[provider] = entry;
		this.observer.notify(provider, entry);
	}

	remove(provider: string): void {
		if (!(provider in this.data)) return;
		delete this.data[provider];
		this.observer.notify(provider, undefined);
	}

	entries(): AuthEntries {
		return { ...this.data };
	}

	subscribe(
		listener: (provider: string, entry: AuthEntry | undefined) => void,
	): () => void {
		return this.observer.subscribe(listener);
	}
}

// ---------------------------------------------------------------------------
// PersistedAuthEntriesStore (decorator)
// ---------------------------------------------------------------------------

export class PersistedAuthEntriesStore extends AuthEntriesStore {
	constructor(private readonly filesystem: Filesystem) {
		super();
		super.subscribe(() => void this.persist());
	}

	async restore(): Promise<void> {
		const raw = await this.filesystem
			.readFile(DEFAULT_AUTH_PATH)
			.then((data) => JSON.parse(data.toString()) as AuthEntries)
			.catch(() => ({}));

		for (const [provider, entry] of Object.entries(raw)) {
			super.set(provider, entry);
		}
	}

	private async persist(): Promise<void> {
		await this.filesystem.writeFile(
			DEFAULT_AUTH_PATH,
			JSON.stringify(this.entries(), null, 2),
		);
	}
}
