/** @returns {import('postcss').Plugin} */
export function franklinTransitions() {
	return {
		postcssPlugin: 'franklin-transitions',
		Declaration(declaration) {
			if (!/^transition(?:-|$)/.test(declaration.prop)) return;
			const rule = declaration.parent;
			if (
				rule?.type !== 'rule' ||
				!rule.selectors.every((selector) =>
					/\.franklin(?![\w-])/.test(selector),
				)
			)
				return;

			// Obsidian suppresses transitions with `.app-container.no-transition *
			// { transition: none !important }`; a failed workspace/plugin operation
			// can leave that flag active. Let .franklin own its declared motion
			// without changing component properties/timings or global editor CSS.
			// Include explicit/reduced-motion disables at the same priority so they
			// still win in the cascade. Reproduced in Obsidian 1.15.1 / Electron 39.
			// https://developer.mozilla.org/en-US/docs/Web/CSS/important
			declaration.important = true;
		},
	};
}
