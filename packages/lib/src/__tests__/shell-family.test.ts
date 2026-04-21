import { describe, expect, it } from 'vitest';
import { detectShellFamily } from '../os-info/shell-family.js';

describe('detectShellFamily', () => {
	it.each([
		['/bin/bash', 'posix'],
		['/bin/sh', 'posix'],
		['/bin/zsh', 'posix'],
		['/bin/dash', 'posix'],
		['/usr/bin/bash', 'posix'],
		['/usr/local/bin/zsh', 'posix'],
		['/usr/bin/ksh', 'posix'],
	])('maps %s to posix', (path, expected) => {
		expect(detectShellFamily(path)).toBe(expected);
	});

	it('maps fish to fish', () => {
		expect(detectShellFamily('/usr/bin/fish')).toBe('fish');
		expect(detectShellFamily('/usr/local/bin/fish')).toBe('fish');
	});

	it.each([
		'pwsh.exe',
		'powershell.exe',
		'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
		'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
	])('maps %s to powershell', (path) => {
		expect(detectShellFamily(path)).toBe('powershell');
	});

	it.each(['cmd.exe', 'C:\\Windows\\System32\\cmd.exe'])(
		'maps %s to cmd',
		(path) => {
			expect(detectShellFamily(path)).toBe('cmd');
		},
	);

	it('handles case-insensitive basenames', () => {
		expect(detectShellFamily('C:\\Windows\\System32\\CMD.EXE')).toBe('cmd');
		expect(detectShellFamily('/usr/bin/BASH')).toBe('posix');
	});

	it('defaults to posix for unknown shells', () => {
		expect(detectShellFamily('/opt/homebrew/bin/nushell')).toBe('posix');
		expect(detectShellFamily('')).toBe('posix');
	});
});
