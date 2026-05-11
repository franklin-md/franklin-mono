import { relative, resolve } from 'node:path';
import { createNodeFilesystem } from '@franklin/node';
import {
	createSingleFilePersister,
	createObserver,
	decode,
	encode,
	joinAbsolute,
	toAbsolutePath,
	versioned,
	zodCodec,
	type AbsolutePath,
	type Filesystem,
	type SingleFilePersister,
	type WriteListener,
} from '@franklin/lib';
import { normalizePath } from 'obsidian';
import type { PluginManifest, Vault } from 'obsidian';
import { z } from 'zod';

import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../utils/obsidian/path.js';

const DIFF_CACHE_FILE = 'diff-cache.json';

type DiffCacheEntry = {
	baseline: Uint8Array | null;
	unopenedNewFile: boolean;
};

type PersistedDiffCacheEntry = {
	baseline: string | null;
	unopenedNewFile: boolean;
};

type PersistedDiffCache = Record<string, PersistedDiffCacheEntry>;

const PersistedDiffCacheEntryV1 = z.object({
	baseline: z.string().nullable(),
	unopenedNewFile: z.boolean(),
});

const PersistedDiffCacheV1 = z.record(
	z.string(),
	PersistedDiffCacheEntryV1,
) as z.ZodType<PersistedDiffCache>;

const diffCacheCodec = versioned()
	.version(1, zodCodec(PersistedDiffCacheV1))
	.build();

type DiffEntry = {
	path: string;
	oldContent: string;
	isNewFile: boolean;
};

export interface DiffClient {
	getEntry(path: string): Promise<DiffEntry | null>;
	listUnopenedNewFiles(): Promise<string[]>;
	markOpened(path: string): Promise<void>;
	setBaseline(path: string, oldContent: string): Promise<void>;
	onEntryChanged(listener: () => void): () => void;
	onEntryAppeared(listener: () => void): () => void;
	onEntryRemoved(listener: () => void): () => void;
}

export class ObsidianDiffClient implements DiffClient {
	private readonly fs: Filesystem = createNodeFilesystem();
	private readonly cache = new Map<AbsolutePath, DiffCacheEntry>();
	private readonly entryChanged = createObserver();
	private readonly entryAppeared = createObserver();
	private readonly entryRemoved = createObserver();
	private readonly vault: Vault;
	private readonly vaultRoot: AbsolutePath;
	private readonly appDir: AbsolutePath;
	private readonly cachePath: AbsolutePath;
	private readonly persister: SingleFilePersister<PersistedDiffCache>;
	private readonly ready: Promise<void>;

	readonly onWrite: WriteListener = (...args) => {
		void this.handleWrite(...args);
	};

	constructor(vault: Vault, manifest: PluginManifest) {
		this.vault = vault;
		this.vaultRoot = toAbsolutePath(getVaultAbsolutePath(vault));
		this.appDir = toAbsolutePath(getPluginAbsolutePath(vault, manifest));
		this.cachePath = joinAbsolute(this.appDir, DIFF_CACHE_FILE);
		this.persister = createSingleFilePersister(
			this.fs,
			this.cachePath,
			diffCacheCodec,
		);
		this.ready = this.load();
	}

	onEntryAppeared(listener: () => void): () => void {
		return this.entryAppeared.subscribe(listener);
	}

	onEntryChanged(listener: () => void): () => void {
		return this.entryChanged.subscribe(listener);
	}

	onEntryRemoved(listener: () => void): () => void {
		return this.entryRemoved.subscribe(listener);
	}

	async getEntry(path: string): Promise<DiffEntry | null> {
		await this.ready;
		const absolutePath = this.resolveVaultPath(path);
		const entry = await this.getCachedEntry(absolutePath);
		if (!entry) return null;

		return {
			path,
			oldContent: decode(entry.baseline ?? new Uint8Array()),
			isNewFile: entry.baseline === null,
		};
	}

	async listUnopenedNewFiles(): Promise<string[]> {
		await this.ready;

		return Array.from(this.cache.entries())
			.filter(([, entry]) => entry.unopenedNewFile)
			.map(([path]) => normalizePath(relative(this.vaultRoot, path)));
	}

	async markOpened(path: string): Promise<void> {
		await this.ready;
		const absolutePath = this.resolveVaultPath(path);
		const entry = await this.getCachedEntry(absolutePath);
		if (!entry) return;

		const current = await this.readCurrent(absolutePath);
		if (isEmptyNewFileEntry(entry, current)) {
			await this.removeCachedEntry(absolutePath);
			return;
		}

		if (!entry.unopenedNewFile) return;

		this.cache.set(absolutePath, createCacheEntry(entry.baseline, false));
		await this.persist();
		this.entryChanged.notify();
	}

	async setBaseline(path: string, oldContent: string): Promise<void> {
		await this.ready;
		const absolutePath = this.resolveVaultPath(path);
		const baseline = encode(oldContent);
		const current = await this.readCurrent(absolutePath);
		const existing = this.cache.get(absolutePath) ?? null;
		const existed = existing !== null;

		if (equalBytes(baseline, current)) {
			if (!existed) return;
			this.cache.delete(absolutePath);
			await this.persist();
			this.entryRemoved.notify();
			this.entryChanged.notify();
			return;
		}

		this.cache.set(
			absolutePath,
			createCacheEntry(baseline, existing?.unopenedNewFile ?? false),
		);
		await this.persist();
		if (!existed) {
			this.entryAppeared.notify();
		}
		this.entryChanged.notify();
	}

	private async handleWrite(...args: Parameters<WriteListener>): Promise<void> {
		await this.ready;
		const [path, prev] = args;

		if (this.cache.has(path)) return;

		this.cache.set(path, createCacheEntry(prev, prev === null));
		await this.persist();
		this.entryAppeared.notify();
		this.entryChanged.notify();

		// TODO: race conditions between agents. Related to
		// the race condition on edit_file tools. CODEX: DO not
		// attempt to solve this.
	}

	private async load(): Promise<void> {
		const { value, issues } = await this.persister.load();
		for (const issue of issues) {
			console.error(
				`[obsidian-diff] Failed to load persisted diff cache: ${issue.kind} at ${issue.path}`,
			);
		}
		if (!value) return;

		for (const [path, entry] of Object.entries(value)) {
			this.cache.set(
				toAbsolutePath(path),
				decodePersistedDiffCacheEntry(entry),
			);
		}
	}

	private async persist(): Promise<void> {
		await this.fs.mkdir(this.appDir, { recursive: true });
		const serialized: PersistedDiffCache = {};
		for (const [path, value] of this.cache) {
			serialized[path] = {
				baseline: value.baseline === null ? null : encodeBase64(value.baseline),
				unopenedNewFile: value.unopenedNewFile,
			};
		}
		await this.persister.save(serialized);
	}

	private resolveVaultPath(path: string): AbsolutePath {
		return toAbsolutePath(resolve(this.vaultRoot, path));
	}

	private async getCachedEntry(
		path: AbsolutePath,
	): Promise<DiffCacheEntry | null> {
		const entry = this.cache.get(path);
		if (!entry) return null;

		const current = await this.readCurrent(path);
		if (equalBytes(entry.baseline, current)) {
			await this.removeCachedEntry(path);
			return null;
		}

		return entry;
	}

	private async removeCachedEntry(path: AbsolutePath): Promise<void> {
		this.cache.delete(path);
		await this.persist();
		this.entryRemoved.notify();
		this.entryChanged.notify();
	}

	private async readCurrent(path: AbsolutePath): Promise<Uint8Array | null> {
		try {
			const vaultPath = normalizePath(relative(this.vaultRoot, path));
			const file = this.vault.getFileByPath(vaultPath);
			return file ? new Uint8Array(await this.vault.readBinary(file)) : null;
		} catch {
			return null;
		}
	}
}

function encodeBase64(value: Uint8Array): string {
	return Buffer.from(value).toString('base64');
}

function decodeBase64(value: string): Uint8Array {
	return new Uint8Array(Buffer.from(value, 'base64'));
}

function createCacheEntry(
	baseline: Uint8Array | null,
	unopenedNewFile: boolean,
): DiffCacheEntry {
	return {
		baseline,
		unopenedNewFile,
	};
}

function isEmptyNewFileEntry(
	entry: DiffCacheEntry,
	current: Uint8Array | null,
): boolean {
	return entry.baseline === null && current?.length === 0;
}

function decodePersistedDiffCacheEntry(
	value: PersistedDiffCacheEntry,
): DiffCacheEntry {
	return createCacheEntry(
		value.baseline === null ? null : decodeBase64(value.baseline),
		value.unopenedNewFile,
	);
}

function equalBytes(
	left: Uint8Array | null,
	right: Uint8Array | null,
): boolean {
	if (left === right) return true;
	if (left === null || right === null) return false;
	if (left.length !== right.length) return false;
	for (let index = 0; index < left.length; index++) {
		if (left[index] !== right[index]) return false;
	}
	return true;
}
