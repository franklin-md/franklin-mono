import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import prefixSelector from 'postcss-prefix-selector';
import {
	mkdirSync,
	readFileSync,
	writeFileSync,
	watch as fsWatch,
} from 'node:fs';
import { resolve } from 'node:path';

const FRANKLIN_PREFIX = '.franklin';
const TAILWIND_PREFIX = '--tw-';

const stripGlobalTailwindAtRules = {
	postcssPlugin: 'strip-global-tailwind-at-rules',
	AtRule(rule) {
		if (rule.name === 'property' && rule.params.startsWith(TAILWIND_PREFIX)) {
			rule.remove();
			return;
		}

		if (rule.name === 'layer' && rule.params.trim() === 'properties') {
			if (rule.nodes?.length) {
				rule.replaceWith(...rule.nodes);
			} else {
				rule.remove();
			}
		}
	},
};

const processor = postcss([
	tailwindcss(),
	prefixSelector({
		prefix: FRANKLIN_PREFIX,
		exclude: [/\.franklin/],
		transform(prefix, selector) {
			if (selector === ':root' || selector === 'html') {
				return prefix;
			}
			return `${prefix} ${selector}`;
		},
	}),
	stripGlobalTailwindAtRules,
]);

export async function buildCSS(rootDir, distDir) {
	const from = resolve(rootDir, 'src/styles/globals.css');
	const to = resolve(distDir, 'styles.css');
	const input = readFileSync(from, 'utf-8');
	const result = await processor.process(input, { from, to });
	mkdirSync(distDir, { recursive: true });
	writeFileSync(to, result.css);
}

export function watchStyles(rootDir, onRebuild) {
	const stylesDir = resolve(rootDir, 'src/styles');
	let timer;
	fsWatch(stylesDir, { recursive: true }, () => {
		clearTimeout(timer);
		timer = setTimeout(onRebuild, 100);
	});
}
