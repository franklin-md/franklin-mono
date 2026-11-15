import type {
	JsonValue,
	MapFilePersister,
	RestoreResult,
	VersionedCodec,
} from '@franklin/lib';

import { BaseStore } from '../base.js';
import type { StoreSnapshot } from './snapshot.js';
import type { Sharing } from '../sharing.js';
import type { StoreEntry, StoreRegistration } from './types.js';
import { encodeStore } from './encode.js';
import { decodeStore } from './decode.js';

/**
 * Central registry of all live store instances.
 *
 * Runtimes hold references (refs) into the registry rather than owning
 * stores directly. This decouples store lifecycle from runtime lifecycle
 * and preserves shared-store identity across persistence/restore.
 *
 * When constructed with a persister, the registry owns its own persistence
 * lifecycle — `restore()` loads snapshots;
 * `prepare()` initializes each reference before runtime access.
 */
export class StoreRegistry {
	private entries = new Map<string, StoreEntry>();
	private readonly initializations = new Map<string, Promise<void>>();

	constructor(private readonly persister?: MapFilePersister<StoreSnapshot>) {}

	/**
	 * Create a new registry entry with a fresh UUID.
	 */
	create(
		sharing: Sharing,
		initial?: JsonValue,
		codec?: VersionedCodec<JsonValue>,
	): StoreEntry {
		const ref = crypto.randomUUID();
		const store = new BaseStore<JsonValue>(initial);
		const entry: StoreEntry = { ref, sharing, store, codec };
		if (codec && initial !== undefined) {
			entry.schemaVersion = encodeStore(entry, initial, codec).schemaVersion;
		}
		this.entries.set(ref, entry);
		if (initial !== undefined) {
			this.initializations.set(ref, Promise.resolve());
			this.observe(entry);
			this.persist(entry);
		}
		return entry;
	}

	/** Initialize once; concurrent users await the same operation. */
	async prepare(
		ref: string,
		{ name, initial, sharing, codec }: StoreRegistration,
	): Promise<void> {
		const entry = this.get(ref);
		const ready = this.initializations.get(ref);
		if (ready) {
			await ready;
			if (
				codec !== entry.codec &&
				codec?.encode(initial).version !== entry.schemaVersion
			) {
				throw new Error(
					`Store "${name}" (ref "${ref}") is already initialized; restore it to change its schema`,
				);
			}
			entry.sharing = sharing;
			return;
		}

		// TODO: can we avoid this?
		// TODO: Is BaseStore actually base type? OR is it concrete?
		const store = entry.store as BaseStore<JsonValue>;
		// Restored stores have data, but still need their codec applied.
		const hasData = store.isInitialized();
		// Shared runtimes await this entire operation, including persistence.
		const initialization = (async () => {
			if (!codec) {
				if (entry.schemaVersion !== undefined) {
					throw new Error(
						'A versioned store requires its versioned codec; removing versioning is unsupported',
					);
				}
				entry.sharing = sharing;
				store.setInitial(initial);
				if (!hasData)
					void this.persister?.save(ref, encodeStore(entry, initial));
			} else {
				const source = hasData
					? encodeStore(entry, store.get())
					: encodeStore(entry, initial, codec);
				const prepared = decodeStore({ ...source, sharing }, codec);
				const changed =
					!hasData ||
					source.sharing !== sharing ||
					source.schemaVersion !== prepared.snapshot.schemaVersion ||
					JSON.stringify(source.value) !==
						JSON.stringify(prepared.snapshot.value);
				if (this.persister && changed) {
					// Start save and flush together: another initialization must not flush
					// our queued snapshot and leave us waiting on an empty flush instead.
					await Promise.all([
						this.persister.save(ref, prepared.snapshot),
						this.persister.flush?.(),
					]);
				}

				entry.sharing = sharing;
				entry.schemaVersion = prepared.snapshot.schemaVersion;
				entry.codec = codec;
				store.set(() => prepared.value);
			}
			this.observe(entry);
		})().catch((error: unknown) => {
			this.initializations.delete(ref);
			const detail = error instanceof Error ? error.message : String(error);
			const source = hasData
				? `schema version ${entry.schemaVersion ?? 0}`
				: 'initial value';
			throw new Error(
				`Store "${name}" (ref "${ref}") could not be initialized from ${source}: ${detail}`,
				{ cause: error },
			);
		});
		this.initializations.set(ref, initialization);
		await initialization;
	}

	/**
	 * Look up a live store by ref. Throws if not found.
	 */
	get(ref: string): StoreEntry {
		const entry = this.entries.get(ref);
		if (!entry) throw new Error(`Store registry entry "${ref}" not found`);
		return entry;
	}

	/**
	 * Hydrate the registry from persisted storage.
	 * No-op when no persister is configured.
	 */
	async restore(): Promise<RestoreResult> {
		if (!this.persister) return { issues: [] };
		const { values, issues } = await this.persister.load();
		for (const [ref, { value, sharing, schemaVersion }] of values) {
			this.initializations.delete(ref);
			this.entries.set(ref, {
				ref,
				sharing,
				schemaVersion,
				store: new BaseStore(value),
			});
		}
		return { issues };
	}

	/**
	 * Persist a single registry entry to the persister.
	 * No-op when no persister is configured.
	 */
	private persist(entry: StoreEntry): void {
		if (!this.persister) return;
		if (!(entry.store as BaseStore<unknown>).isInitialized()) return;
		const snapshot = encodeStore(
			entry,
			entry.store.get() as JsonValue,
			entry.codec,
		);
		void this.persister.save(entry.ref, snapshot);
	}

	private observe(entry: StoreEntry): void {
		// I wonder if we need to unsubscribe from the store on GC?
		// It feels like we don't because if we are GCing, there won't be any changes to the store.
		if (this.persister) {
			entry.store.subscribe(() => {
				this.persist(entry);
			});
		}
	}
}
