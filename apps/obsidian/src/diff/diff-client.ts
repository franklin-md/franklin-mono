import { resolve } from 'node:path';
import { createNodeFilesystem } from '@franklin/node';
import {
	createObserver,
	decode,
	encode,
	joinAbsolute,
	toAbsolutePath,
	type AbsolutePath,
	type WriteListener,
} from '@franklin/lib';
import type { PluginManifest, Vault } from 'obsidian';

import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../utils/obsidian/path.js';

const DIFF_CACHE_FILE = 'diff-cache.json';

type PersistedDiffCache = Record<string, string | null>;

export type DiffEntry = {
	path: string;
	oldContent: string;
};

export interface DiffClient {
	getEntry(path: string): Promise<DiffEntry | null>;
	setBaseline(path: string, oldContent: string): Promise<void>;
	onEntryAppeared(listener: () => void): () => void;
	onEntryRemoved(listener: () => void): () => void;
}

export class ObsidianDiffClient implements DiffClient {
	private readonly fs = createNodeFilesystem();
	private readonly cache = new Map<AbsolutePath, Uint8Array | null>();
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

	onEntryRemoved(listener: () => void): () => void {
		return this.entryRemoved.subscribe(listener);
	}

	async getEntry(path: string): Promise<DiffEntry | null> {
		await this.ready;
		const absolutePath = this.resolveVaultPath(path);
		if (!this.cache.has(absolutePath)) return null;

		const previous = this.cache.get(absolutePath) ?? null;
		const current = await this.readCurrent(absolutePath);

		if (equalBytes(previous, current)) {
			this.cache.delete(absolutePath);
			await this.persist();
			this.entryRemoved.notify();
			return null;
		}

		return {
			path,
			oldContent: decode(previous ?? new Uint8Array()),
		};
	}

	async setBaseline(path: string, oldContent: string): Promise<void> {
		await this.ready;
		const absolutePath = this.resolveVaultPath(path);
		const baseline = encode(oldContent);
		const current = await this.readCurrent(absolutePath);
		const existed = this.cache.has(absolutePath);

		if (equalBytes(baseline, current)) {
			if (!existed) return;
			this.cache.delete(absolutePath);
			await this.persist();
			this.entryRemoved.notify();
			return;
		}

		this.cache.set(absolutePath, baseline);
		await this.persist();
		if (!existed) {
			this.entryAppeared.notify();
		}
	}

	private async handleWrite(...args: Parameters<WriteListener>): Promise<void> {
		await this.ready;
		const [path, prev] = args;

		if (this.cache.has(path)) return;

		this.cache.set(path, prev);
		await this.persist();
		this.entryAppeared.notify();

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
				this.cache.set(
					toAbsolutePath(path),
					value === null ? null : decodeBase64(value),
				);
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
			serialized[path] = value === null ? null : encodeBase64(value);
		}
		await this.fs.writeFile(
			this.cachePath,
			JSON.stringify(serialized, null, 2),
		);
	}

	private resolveVaultPath(path: string): AbsolutePath {
		return toAbsolutePath(resolve(this.vaultRoot, path));
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
		if (entry !== null && typeof entry !== 'string') return false;
	}
	return true;
}
