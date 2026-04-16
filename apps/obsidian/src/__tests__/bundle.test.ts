import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const dist = resolve(root, 'dist');

describe('obsidian bundle', () => {
	beforeAll(() => {
		// Clean dist so we know the output is fresh
		rmSync(dist, { recursive: true, force: true });
		execSync('node ./build/bundle.mjs', { cwd: root, stdio: 'pipe' });
	}, 30_000);

	it('produces dist/main.js', () => {
		expect(existsSync(resolve(dist, 'main.js'))).toBe(true);
	});

	it('bundles a single copy of @franklin/react context modules', () => {
		const js = readFileSync(resolve(dist, 'main.js'), 'utf8');

		expect(js).toContain(
			'../../packages/ui/react/src/agent/franklin-context.tsx',
		);
		expect(js).not.toContain(
			'../../packages/ui/react/dist/agent/franklin-context.js',
		);
		expect(js).not.toContain(
			'../../packages/ui/react/dist/agent/agent-context.js',
		);
	});

	it('produces dist/styles.css with Tailwind utilities', () => {
		const css = readFileSync(resolve(dist, 'styles.css'), 'utf8');

		// Tailwind utilities used in the app components should be present
		expect(css).toContain('flex');
		expect(css).toContain('gap-4');
		expect(css).toContain('rounded-lg');
		expect(css).toContain('text-sm');
	});

	it('styles.css includes .franklin prefix scoping', () => {
		const css = readFileSync(resolve(dist, 'styles.css'), 'utf8');

		// The PostCSS prefix plugin wraps selectors with .franklin
		expect(css).toContain('.franklin');
	});

	it('styles.css includes Obsidian token bridge variables', () => {
		const css = readFileSync(resolve(dist, 'styles.css'), 'utf8');

		// variables.css maps Obsidian vars → Franklin tokens (minified, no spaces around colon)
		expect(css).toContain('--background:var(--background-primary)');
		expect(css).toContain('--primary:var(--interactive-accent)');
	});

	it('produces dist/manifest.json', () => {
		expect(existsSync(resolve(dist, 'manifest.json'))).toBe(true);
	});

	it('bundles node_modules into main.js instead of leaving external requires', () => {
		const js = readFileSync(resolve(dist, 'main.js'), 'utf8');

		// React and ReactDOM should be inlined — no external require calls for them
		expect(js).not.toMatch(/require\(["']react["']\)/);
		expect(js).not.toMatch(/require\(["']react-dom["']\)/);
		expect(js).not.toMatch(/require\(["']react-dom\/client["']\)/);
		expect(js).not.toMatch(/require\(["']react\/jsx-runtime["']\)/);

		// Externals that Obsidian provides should still be require() calls
		expect(js).toMatch(/require\(["']obsidian["']\)/);
	});
});
