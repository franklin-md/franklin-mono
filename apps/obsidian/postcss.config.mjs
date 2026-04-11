import tailwindcss from '@tailwindcss/postcss';
import prefixSelector from 'postcss-prefix-selector';

export default {
	plugins: [
		tailwindcss(),
		prefixSelector({
			prefix: '.franklin',
			// Don't double-prefix our own scoping selector from variables.css
			exclude: [/\.franklin/],
			transform(prefix, selector) {
				// :root and html selectors become the prefix selector itself
				if (selector === ':root' || selector === 'html') {
					return prefix;
				}
				return `${prefix} ${selector}`;
			},
		}),
	],
};
