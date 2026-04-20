import path from 'node:path';

import { vi } from 'vitest';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import type { TFile, Vault } from 'obsidian';

export function makeFile(filePath: string): TFile {
	const name = filePath.split('/').pop() ?? filePath;
	const dotIndex = name.lastIndexOf('.');
	return {
		path: filePath,
		name,
		basename: dotIndex >= 0 ? name.slice(0, dotIndex) : name,
		extension: dotIndex >= 0 ? name.slice(dotIndex + 1) : '',
		stat: { ctime: 0, mtime: 0, size: 0, type: 'file' },
		vault: {} as Vault,
		parent: null,
	} as TFile;
}

export function mockHostFs(): Filesystem {
	return {
		resolve: vi.fn(
			async (...paths: string[]) =>
				path.resolve(...(paths as [string, ...string[]])) as AbsolutePath,
		),
		readFile: vi.fn().mockResolvedValue(new Uint8Array()),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		access: vi.fn().mockResolvedValue(undefined),
		stat: vi.fn().mockResolvedValue({ isFile: true, isDirectory: false }),
		readdir: vi.fn().mockResolvedValue([]),
		exists: vi.fn().mockResolvedValue(true),
		glob: vi.fn().mockResolvedValue([]),
		deleteFile: vi.fn().mockResolvedValue(undefined),
	};
}
