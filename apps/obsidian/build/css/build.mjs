import { readFileSync, writeFileSync, mkdirSync, watch } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { franklinPrefix } from './prefix.mjs';

/**
 * Creates a CSS builder (PostCSS + Tailwind). Returns `{ build, watch }`.
 *
 * @param {import('../cli.mjs').BuildArgs} args
 * @returns {{ build: () => Promise<void>, watch: (onEnd: () => void) => void }}
 */
export function createCssBuilder({ srcDir, distDir, isWatch }) {
	const cssEntry = resolve(srcDir, 'styles/globals.css');
	const processor = postcss([
		tailwindcss({ optimize: !isWatch }),
		franklinPrefix(),
	]);

	async function build() {
		const css = readFileSync(cssEntry, 'utf8');
		const result = await processor.process(css, {
			from: cssEntry,
			to: resolve(distDir, 'styles.css'),
		});
		mkdirSync(distDir, { recursive: true });
		writeFileSync(resolve(distDir, 'styles.css'), result.css);
	}

	return {
		build,

		watch(onEnd) {
			let timer;
			watch(srcDir, { recursive: true }, (_event, filename) => {
				if (!filename) return;
				if (!/\.(ts|tsx|css)$/.test(filename)) return;

				clearTimeout(timer);
				timer = setTimeout(async () => {
					try {
						await build();
						onEnd();
						console.log('CSS rebuilt');
					} catch (err) {
						console.error('CSS build error:', err.message);
					}
				}, 100);
			});
		},
	};
}
