import prefixSelector from 'postcss-prefix-selector';

const FRANKLIN_PREFIX = '.franklin';

/**
 * Selectors that should be passed through unchanged by `franklinPrefix`.
 * Each pattern represents a class of selector whose meaning would break
 * if mechanically wrapped with `.franklin`.
 */
function ignoreSelector(selector) {
	// Diff plugin widgets live in Obsidian's CodeMirror tree (outside the
	// .franklin container) and need their selectors kept global to attach.
	const GLOBAL_DIFF_SELECTOR =
		/diff-plugin-|\.cm-line:has\(\.diff-plugin-actions-host\)/;
	// Obsidian's theme indicators sit on <body> (e.g. `body.theme-dark`).
	// <body> is an ancestor of `.franklin`, not a descendant — prefixing
	// would produce `.franklin body.theme-...` which never matches.
	const OBSIDIAN_THEME_SELECTOR = /^body\.theme-/;
	return (
		GLOBAL_DIFF_SELECTOR.test(selector) ||
		OBSIDIAN_THEME_SELECTOR.test(selector)
	);
}

/** PostCSS plugin that wraps every selector with `.franklin`. */
export function franklinPrefix() {
	return prefixSelector({
		prefix: FRANKLIN_PREFIX,
		exclude: [/\.franklin/],
		transform(prefix, selector) {
			if (ignoreSelector(selector)) {
				return selector;
			}
			if (selector === ':root' || selector === 'html') {
				return prefix;
			}
			return `${prefix} ${selector}`;
		},
	});
}
