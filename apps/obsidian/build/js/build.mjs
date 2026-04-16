import { resolve } from 'node:path';
import esbuild from 'esbuild';

/**
 * Creates a JS builder (esbuild). Returns `{ build, watch }`.
 *
 * @param {import('../cli.mjs').BuildArgs} args
 * @returns {{ build: () => Promise<void>, watch: (onEnd: () => void) => Promise<void> }}
 */
// Although Franklin expects to transition to open-source soon, it is currently
// closed-source. Full obfuscation is not performed because Obsidian's developer
// policies prohibit plugins from obfuscating code to hide their purpose. We
// limit production builds to standard minification (identifier mangling, syntax
// compaction, whitespace removal) which is permitted.
// See: https://docs.obsidian.md/Developer+policies
export function createJsBuilder({ srcDir, distDir, isProd }) {
	const options = {
		entryPoints: [resolve(srcDir, 'main.ts')],
		bundle: true,
		outfile: resolve(distDir, 'main.js'),
		tsconfig: resolve(srcDir, '../../../tsconfig.base.json'),
		format: 'cjs',
		platform: 'node',
		target: 'es2022',
		jsx: 'automatic',
		sourcemap: !isProd,
		minify: isProd,
		logLevel: 'info',
		external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
		define: {
			'process.env.NODE_ENV': isProd ? '"production"' : '"development"',
		},
	};

	return {
		async build() {
			await esbuild.build(options);
		},

		async watch(onEnd) {
			const ctx = await esbuild.context({
				...options,
				plugins: [
					...(options.plugins ?? []),
					{
						name: 'on-end',
						setup(build) {
							build.onEnd((result) => {
								if (result.errors.length === 0) onEnd();
							});
						},
					},
				],
			});
			await ctx.watch();
		},
	};
}
