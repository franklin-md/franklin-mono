import { describe, expect, it } from 'vitest';
import type { AbsolutePath } from '@franklin/lib';
import { renderEnvironmentInfo } from '../render.js';

describe('renderEnvironmentInfo', () => {
	it('emits a flat key/value block matching CC-style output', () => {
		const rendered = renderEnvironmentInfo({
			cwd: '/Users/afv/project' as AbsolutePath,
			platform: 'mac',
			shell: { path: '/bin/zsh', family: 'posix' },
			osVersion: 'Darwin 24.6.0',
			homeDir: '/Users/afv' as AbsolutePath,
		});

		expect(rendered).toBe(
			[
				'Working directory: /Users/afv/project',
				'Platform: mac',
				'Shell: /bin/zsh (posix)',
				'OS Version: Darwin 24.6.0',
				'Home directory: /Users/afv',
			].join('\n'),
		);
	});

	it('includes the shell family in parens even for non-posix shells', () => {
		const rendered = renderEnvironmentInfo({
			cwd: '/tmp' as AbsolutePath,
			platform: 'windows',
			shell: { path: 'pwsh.exe', family: 'powershell' },
			osVersion: 'Windows_NT 10.0.22631',
			homeDir: '/Users/test' as AbsolutePath,
		});

		expect(rendered).toContain('Shell: pwsh.exe (powershell)');
		expect(rendered).toContain('Platform: windows');
	});
});
