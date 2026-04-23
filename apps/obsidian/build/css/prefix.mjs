import prefixSelector from 'postcss-prefix-selector';

const FRANKLIN_PREFIX = '.franklin';
const GLOBAL_DIFF_SELECTOR =
	/diff-plugin-|\.cm-line:has\(\.diff-plugin-actions-host\)/;

/** PostCSS plugin that wraps every selector with `.franklin`. */
export function franklinPrefix() {
	return prefixSelector({
		prefix: FRANKLIN_PREFIX,
		exclude: [/\.franklin/],
		transform(prefix, selector) {
			if (GLOBAL_DIFF_SELECTOR.test(selector)) {
				return selector;
			}
			if (selector === ':root' || selector === 'html') {
				return prefix;
			}
			return `${prefix} ${selector}`;
		},
	});
}
