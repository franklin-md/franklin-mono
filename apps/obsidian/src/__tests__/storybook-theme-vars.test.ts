import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const extractor = resolve(root, 'build/extract-obsidian-theme-vars.mjs');
const snapshot = resolve(root, '.storybook/obsidian-default-theme-vars.css');

describe('Obsidian Storybook theme variables', () => {
	it('includes the documented default link variables', () => {
		const css = readFileSync(snapshot, 'utf8');

		expect(css).toContain('Generated from Obsidian Desktop');
		expect(css).toMatch(/--anim-duration-none:\s*0;/);
		expect(css).toMatch(/--border-width:\s*1px;/);
		expect(css).toMatch(/--bold-modifier:\s*200;/);
		expect(css).toMatch(/--link-color:\s*var\(--text-accent\);/);
		expect(css).toMatch(/--link-color-hover:\s*var\(--text-accent-hover\);/);
		expect(css).toMatch(/--link-external-color:\s*var\(--text-accent\);/);
		expect(css).toMatch(
			/--link-external-color-hover:\s*var\(--text-accent-hover\);/,
		);
		expect(css).toMatch(/--link-unresolved-color:\s*var\(--text-accent\);/);
		expect(css).toMatch(/--link-unresolved-opacity:\s*0\.7;/);
		expect(css).toMatch(
			/--link-unresolved-decoration-color:\s*hsla\(var\(--interactive-accent-hsl\), 0\.3\);/,
		);
		expect(css).not.toContain('.is-mobile');
		expect(css).not.toContain('.is-phone');
		expect(css).not.toContain('.is-tablet');
	});

	it('extracts global Obsidian theme variable declarations only', () => {
		const dir = mkdtempSync(join(tmpdir(), 'franklin-obsidian-vars-'));
		const input = join(dir, 'app.css');
		const output = join(dir, 'vars.css');

		writeFileSync(
			input,
			`
:root {
  --root-token: root;
}

@supports (font-variation-settings: normal) {
  :root {
    --supported-token: supported;
  }
}

body {
  --link-color: first;
  color: red;
}

body {
  --link-color: var(--text-accent);
  --body-token: body;
}

.theme-light,
.theme-dark {
  --shared-token: shared;
}

.theme-light {
  --light-token: light;
}

.theme-dark {
  --dark-token: dark;
}

.is-phone {
  --mobile-token: mobile;
}

.markdown-rendered {
  --local-token: local;
}
`,
		);

		try {
			execFileSync(process.execPath, [
				extractor,
				input,
				output,
				'--version=fixture',
			]);

			const css = readFileSync(output, 'utf8');

			expect(css).toContain('--root-token: root;');
			expect(css).toContain('--supported-token: supported;');
			expect(css).toContain('--link-color: var(--text-accent);');
			expect(css).toContain('--body-token: body;');
			expect(css).toContain('--shared-token: shared;');
			expect(css).toContain('--light-token: light;');
			expect(css).toContain('--dark-token: dark;');
			expect(css.match(/^body \{/gm)).toHaveLength(1);
			expect(css).not.toContain('--link-color: first;');
			expect(css).not.toContain('--mobile-token');
			expect(css).not.toContain('--local-token');
			expect(css).not.toContain('color: red');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
