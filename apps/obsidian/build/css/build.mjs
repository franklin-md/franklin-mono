import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { franklinPrefix } from './prefix.mjs';

/**
 * Creates a CSS builder that compiles Tailwind + prefix-scoped CSS.
 *
 * @param {{ srcDir: string, distDir: string, isWatch: boolean }} opts
 * @returns {() => Promise<void>} buildCss function
 */
export function createCssBuilder({ srcDir, distDir, isWatch }) {
	const cssEntry = resolve(srcDir, 'styles/globals.css');
	const processor = postcss([
		tailwindcss({ optimize: !isWatch }),
		franklinPrefix(),
	]);

	return async function buildCss() {
		const css = readFileSync(cssEntry, 'utf8');
		const result = await processor.process(css, {
			from: cssEntry,
			to: resolve(distDir, 'styles.css'),
		});
		mkdirSync(distDir, { recursive: true });
		writeFileSync(resolve(distDir, 'styles.css'), result.css);
	};
}
