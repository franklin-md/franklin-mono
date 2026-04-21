import { afterEach, describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import { createNodeOsInfo } from '../platform/os-info.js';

describe('createNodeOsInfo', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns platform from os.platform()', async () => {
		vi.spyOn(os, 'platform').mockReturnValue('linux');
		const info = createNodeOsInfo();
		await expect(info.getPlatform()).resolves.toBe('linux');
	});

	it('combines os.type() and os.release() for version string', async () => {
		vi.spyOn(os, 'type').mockReturnValue('Darwin');
		vi.spyOn(os, 'release').mockReturnValue('24.6.0');
		const info = createNodeOsInfo();
		await expect(info.getOsVersion()).resolves.toBe('Darwin 24.6.0');
	});

	it('returns homedir as AbsolutePath', async () => {
		vi.spyOn(os, 'homedir').mockReturnValue('/home/testuser');
		const info = createNodeOsInfo();
		await expect(info.getHomeDir()).resolves.toBe('/home/testuser');
	});

	it('reads shell from $SHELL env var and detects family', async () => {
		const prev = process.env.SHELL;
		process.env.SHELL = '/usr/bin/fish';
		try {
			const info = createNodeOsInfo();
			await expect(info.getShellInfo()).resolves.toEqual({
				path: '/usr/bin/fish',
				family: 'fish',
			});
		} finally {
			if (prev === undefined) delete process.env.SHELL;
			else process.env.SHELL = prev;
		}
	});

	it('falls back to /bin/sh posix when $SHELL is unset on non-windows', async () => {
		vi.spyOn(os, 'platform').mockReturnValue('linux');
		const prev = process.env.SHELL;
		delete process.env.SHELL;
		try {
			const info = createNodeOsInfo();
			await expect(info.getShellInfo()).resolves.toEqual({
				path: '/bin/sh',
				family: 'posix',
			});
		} finally {
			if (prev !== undefined) process.env.SHELL = prev;
		}
	});

	it('falls back to cmd.exe on windows when $SHELL is unset', async () => {
		vi.spyOn(os, 'platform').mockReturnValue('win32');
		const prev = process.env.SHELL;
		delete process.env.SHELL;
		try {
			const info = createNodeOsInfo();
			await expect(info.getShellInfo()).resolves.toEqual({
				path: 'cmd.exe',
				family: 'cmd',
			});
		} finally {
			if (prev !== undefined) process.env.SHELL = prev;
		}
	});
});
