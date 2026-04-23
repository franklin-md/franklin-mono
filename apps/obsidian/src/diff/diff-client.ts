import { relative, resolve } from 'node:path';
import { createNodeFilesystem } from '@franklin/node';
import {
	createObserver,
	decode,
	encode,
	joinAbsolute,
	toAbsolutePath,
	type AbsolutePath,
	type Filesystem,
	type WriteListener,
} from '@franklin/lib';
import { normalizePath } from 'obsidian';
import type { PluginManifest, Vault } from 'obsidian';

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
	unopenedNewFile?: boolean;
};

type PersistedDiffCache = Record<
	string,
	PersistedDiffCacheEntry | string | null
>;

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
	private readonly vaultRoot: AbsolutePath;
	private readonly appDir: AbsolutePath;
	private readonly cachePath: AbsolutePath;
	private readonly ready: Promise<void>;

	readonly onWrite: WriteListener = (...args) => {
		void this.handleWrite(...args);
	};

	constructor(vault: Vault, manifest: PluginManifest) {
		this.vaultRoot = toAbsolutePath(getVaultAbsolutePath(vault));
		this.appDir = toAbsolutePath(getPluginAbsolutePath(vault, manifest));
		this.cachePath = joinAbsolute(this.appDir, DIFF_CACHE_FILE);
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
		if (!entry?.unopenedNewFile) return;

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
		if (!(await this.fs.exists(this.cachePath))) return;

		try {
			const raw = await this.fs.readFile(this.cachePath);
			const parsed = JSON.parse(decode(raw)) as unknown;
			if (!isPersistedDiffCache(parsed)) return;
			for (const [path, value] of Object.entries(parsed)) {
				const entry = decodePersistedDiffCacheEntry(value);
				this.cache.set(toAbsolutePath(path), entry);
			}
		} catch (error: unknown) {
			console.error(
				`[obsidian-diff] Failed to load persisted diff cache: ${error instanceof Error ? error.message : String(error)}`,
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
		await this.fs.writeFile(
			this.cachePath,
			JSON.stringify(serialized, null, 2),
		);
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
			this.cache.delete(path);
			await this.persist();
			this.entryRemoved.notify();
			this.entryChanged.notify();
			return null;
		}

		return entry;
	}

	private async readCurrent(path: AbsolutePath): Promise<Uint8Array | null> {
		try {
			return await this.fs.readFile(path);
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

function decodePersistedDiffCacheEntry(
	value: PersistedDiffCache[string],
): DiffCacheEntry {
	if (value === null || typeof value === 'string') {
		return createCacheEntry(
			value === null ? null : decodeBase64(value),
			value === null,
		);
	}

	return createCacheEntry(
		value.baseline === null ? null : decodeBase64(value.baseline),
		value.unopenedNewFile ?? false,
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

function isPersistedDiffCache(value: unknown): value is PersistedDiffCache {
	if (typeof value !== 'object' || value === null) return false;
	for (const entry of Object.values(value)) {
		if (entry === null || typeof entry === 'string') continue;
		if (typeof entry !== 'object') return false;
		if (!('baseline' in entry)) return false;
		const { baseline, unopenedNewFile } = entry;
		if (baseline !== null && typeof baseline !== 'string') return false;
		if (unopenedNewFile !== undefined && typeof unopenedNewFile !== 'boolean') {
			return false;
		}
	}
	return true;
}
