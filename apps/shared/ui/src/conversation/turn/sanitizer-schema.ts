import type { Options as SanitizeSchema } from 'rehype-sanitize';

type Attribute = NonNullable<SanitizeSchema['attributes']>[string][number];

/**
 * Extends sanitizer allowlists while retaining the base schema's other rules.
 * This configures rehype-sanitize; the plugin later transforms the HAST tree.
 *
 * Example:
 *   extendSanitizerSchema(base, {
 *     tagNames: ['note-ref'],
 *     attributes: { 'note-ref': ['path'] },
 *     protocols: { href: ['note-app'] },
 *   });
 *
 * The resulting schema keeps existing tags, attributes and URL schemes, and
 * adds the declarations above. Sanitizing:
 *   <note-ref path="Notes.md" onclick="alert(1)">Read</note-ref>
 * produces:
 *   <note-ref path="Notes.md">Read</note-ref>
 * and also preserves:
 *   <a href="note-app://open">Open</a>
 * while still stripping undeclared onclick attributes and script elements.
 * Custom React renderers are registered separately through customElements.
 *
 * Attribute value rules for the same property are combined: adding an allowed
 * code class retains the default language-* class rule. An attribute name alone
 * explicitly permits all of that attribute's values; URL protocol checks remain.
 * Inputs are never mutated, so one host's extensions cannot change defaults.
 * https://github.com/syntax-tree/hast-util-sanitize#schema
 */
export function extendSanitizerSchema(
	base: SanitizeSchema,
	...extensions: (
		| Pick<SanitizeSchema, 'tagNames' | 'attributes' | 'protocols'>
		| undefined
	)[]
): SanitizeSchema {
	const schema = {
		...base,
		tagNames: [...(base.tagNames ?? [])],
		attributes: { ...base.attributes },
		protocols: { ...base.protocols },
	};

	for (const extension of extensions) {
		schema.tagNames = [
			...new Set([...schema.tagNames, ...(extension?.tagNames ?? [])]),
		];
		for (const [tag, attributes] of Object.entries(
			extension?.attributes ?? {},
		)) {
			schema.attributes[tag] = mergeAttributeRules(
				schema.attributes[tag] ?? [],
				attributes,
			);
		}
		for (const [attribute, protocols] of Object.entries(
			extension?.protocols ?? {},
		)) {
			schema.protocols[attribute] = [
				...new Set([
					...(schema.protocols[attribute] ?? []),
					...(protocols ?? []),
				]),
			];
		}
	}

	return schema;
}

// Generic array concatenation leaves duplicate rules, such as
// [['className', /^language-/], ['className', 'host-code']]. The sanitizer
// uses only the first match, so combine their values into one rule instead.
// https://github.com/syntax-tree/hast-util-sanitize/blob/main/lib/index.js#L744
function mergeAttributeRules(existing: Attribute[], additional: Attribute[]) {
	const attributes = new Map<string, Attribute>();
	for (const definition of [...existing, ...additional]) {
		const name = typeof definition === 'string' ? definition : definition[0];
		const previous = attributes.get(name);
		if (previous === undefined) {
			attributes.set(name, definition);
		} else if (
			typeof previous === 'string' ||
			typeof definition === 'string' ||
			previous.length === 1 ||
			definition.length === 1
		) {
			attributes.set(name, name);
		} else {
			attributes.set(name, [
				name,
				...new Set([...previous.slice(1), ...definition.slice(1)]),
			]);
		}
	}
	return [...attributes.values()];
}
