import {
	defaultRehypePlugins,
	defaultRemarkPlugins,
	Streamdown,
	type Components,
	type StreamdownProps,
} from 'streamdown';
import { code } from '@streamdown/code';
import { createMathPlugin } from '@streamdown/math';
import type { ComponentType } from 'react';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import { chromeComponents } from './text/chrome/components.js';

const math = createMathPlugin({
	singleDollarTextMath: true,
});

const plugins = { code, math };
const baseRemarkPlugins = Object.values(defaultRemarkPlugins);

// Note links must survive sanitization before rehype-harden checks their URLs.
// Preserve Streamdown's tel: and code-metadata extensions to GitHub's schema.
// See https://streamdown.ai/docs/security
const sanitizeSchema = {
	...defaultSchema,
	protocols: {
		...defaultSchema.protocols,
		href: [...(defaultSchema.protocols?.href ?? []), 'tel', 'obsidian'],
	},
	attributes: {
		...defaultSchema.attributes,
		code: [...(defaultSchema.attributes?.code ?? []), 'metastring'],
	},
};
const baseRehypePlugins = createRehypePlugins();

export interface MarkdownExtensions {
	components?: Components;
	customElements?: CustomMarkdownElements;
	remend?: StreamdownProps['remend'];
	remarkPlugins?: StreamdownProps['remarkPlugins'];
}

export interface CustomMarkdownElement<Props extends object = object> {
	allowedAttributes?: readonly string[];
	component: ComponentType<Props>;
}

export type CustomMarkdownElements = Record<
	string,
	CustomMarkdownElement<never>
>;

export interface MarkdownProps extends MarkdownExtensions {
	text: string;
	className?: string;
}

export function Markdown({
	text,
	className = 'prose-content',
	components,
	customElements,
	remend,
	remarkPlugins,
}: MarkdownProps) {
	const custom = resolveCustomElements(customElements);

	return (
		<div className={className}>
			<Streamdown
				mode="streaming"
				plugins={plugins}
				rehypePlugins={
					custom.allowedTags
						? createRehypePlugins(custom.allowedTags)
						: baseRehypePlugins
				}
				remarkPlugins={
					remarkPlugins ? [...baseRemarkPlugins, ...remarkPlugins] : undefined
				}
				components={{
					...chromeComponents,
					...components,
					...custom.components,
				}}
				controls={false}
				remend={remend}
			>
				{text}
			</Streamdown>
		</div>
	);
}

function createRehypePlugins(allowedTags: Record<string, string[]> = {}) {
	// Streamdown's allowedTags only extends its default plugin array. Once we
	// supply a sanitizer, we must merge the host's declared elements ourselves.
	const schema = {
		...sanitizeSchema,
		tagNames: [...(sanitizeSchema.tagNames ?? []), ...Object.keys(allowedTags)],
		attributes: { ...sanitizeSchema.attributes, ...allowedTags },
	};
	return Object.values({
		...defaultRehypePlugins,
		sanitize: [rehypeSanitize, schema] satisfies [
			typeof rehypeSanitize,
			typeof schema,
		],
	});
}

function resolveCustomElements(
	customElements: CustomMarkdownElements | undefined,
) {
	if (!customElements) return { components: {}, allowedTags: undefined };

	const components: Record<string, NonNullable<Components[string]>> = {};
	const allowedTags: Record<string, string[]> = {};

	for (const [tagName, element] of Object.entries(customElements)) {
		components[tagName] = element.component as NonNullable<Components[string]>;
		allowedTags[tagName] = [...(element.allowedAttributes ?? [])];
	}

	return { components, allowedTags };
}
