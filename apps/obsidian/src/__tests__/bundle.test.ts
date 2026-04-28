import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const dist = resolve(root, 'dist');

type BundleOutput = {
	js: string;
	css: string;
	hasMain: boolean;
	hasManifest: boolean;
};

function buildBundle(args: string[] = []): BundleOutput {
	rmSync(dist, { recursive: true, force: true });
	execFileSync(process.execPath, ['./build/bundle.mjs', ...args], {
		cwd: root,
		stdio: 'pipe',
	});

	return {
		js: readFileSync(resolve(dist, 'main.js'), 'utf8'),
		css: readFileSync(resolve(dist, 'styles.css'), 'utf8'),
		hasMain: existsSync(resolve(dist, 'main.js')),
		hasManifest: existsSync(resolve(dist, 'manifest.json')),
	};
}

describe('obsidian bundle', () => {
	let devBundle: BundleOutput;
	let prodBundle: BundleOutput;

	beforeAll(() => {
		devBundle = buildBundle();
		prodBundle = buildBundle(['--prod']);
	}, 60_000);

	it('produces dist/main.js', () => {
		expect(devBundle.hasMain).toBe(true);
	});

	it('bundles a single copy of @franklin/react context modules', () => {
		expect(devBundle.js).toContain(
			'../../packages/ui/react/src/agent/franklin-context.tsx',
		);
		expect(devBundle.js).not.toContain(
			'../../packages/ui/react/dist/agent/franklin-context.js',
		);
		expect(devBundle.js).not.toContain(
			'../../packages/ui/react/dist/agent/agent-context.js',
		);
	});

	it('produces dist/styles.css with Tailwind utilities', () => {
		// Tailwind utilities used in the app components should be present
		expect(devBundle.css).toContain('flex');
		expect(devBundle.css).toContain('gap-4');
		expect(devBundle.css).toContain('rounded-lg');
		expect(devBundle.css).toContain('text-sm');
	});

	it('styles.css includes .franklin prefix scoping', () => {
		// The PostCSS prefix plugin wraps selectors with .franklin
		expect(devBundle.css).toContain('.franklin');
	});

	it('leaves diff editor selectors unscoped so they apply in Markdown views', () => {
		expect(devBundle.css).toContain('.diff-plugin-added-line');
		expect(devBundle.css).toContain('.diff-plugin-unopened-new-file');
		expect(devBundle.css).not.toContain('.franklin .diff-plugin-added-line');
		expect(devBundle.css).toContain('.cm-line:has(.diff-plugin-actions-host)');
		expect(devBundle.css).not.toContain(
			'.franklin .cm-line:has(.diff-plugin-actions-host)',
		);
	});

	it('styles.css includes Obsidian token bridge variables', () => {
		// variables.css maps Obsidian vars → Franklin tokens (minified, no spaces around colon)
		expect(devBundle.css).toContain('--background:var(--background-primary)');
		expect(devBundle.css).toContain('--primary:var(--interactive-accent)');
	});

	it('includes the transcript text selection utility', () => {
		expect(devBundle.css).toContain('.franklin .select-text');
		expect(devBundle.css).toContain('user-select:text');
	});

	it('produces dist/manifest.json', () => {
		expect(devBundle.hasManifest).toBe(true);
	});

	it('bundles node_modules into main.js instead of leaving external requires', () => {
		// React and ReactDOM should be inlined — no external require calls for them
		expect(devBundle.js).not.toMatch(/require\(["']react["']\)/);
		expect(devBundle.js).not.toMatch(/require\(["']react-dom["']\)/);
		expect(devBundle.js).not.toMatch(/require\(["']react-dom\/client["']\)/);
		expect(devBundle.js).not.toMatch(/require\(["']react\/jsx-runtime["']\)/);

		// Externals that Obsidian provides should still be require() calls
		expect(devBundle.js).toMatch(/require\(["']obsidian["']\)/);
	});

	it('includes React Scan in dev bundles only', () => {
		expect(devBundle.js).toContain('ReactScanInternals');
		expect(prodBundle.js).not.toContain('ReactScanInternals');
		expect(prodBundle.js).not.toContain('react-scan');
	});
});
