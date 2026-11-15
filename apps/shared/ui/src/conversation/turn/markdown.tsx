import {
	defaultRehypePlugins,
	defaultRemarkPlugins,
	Streamdown,
	type Components,
	type StreamdownProps,
} from 'streamdown';
import { code } from '@streamdown/code';
import { createMathPlugin } from '@streamdown/math';
import { useMemo, type ComponentType } from 'react';
import type rehypeSanitize from 'rehype-sanitize';
import type { Options as SanitizeSchema } from 'rehype-sanitize';

import { extendSanitizerSchema } from './sanitizer-schema.js';
import { chromeComponents } from './text/chrome/components.js';

const math = createMathPlugin({
	singleDollarTextMath: true,
});

const plugins = { code, math };
const baseRemarkPlugins = Object.values(defaultRemarkPlugins);
// Use Streamdown's configured schema so telephone links and code metadata
// remain supported without duplicating its defaults here.
const [sanitizePlugin, baseSanitizeSchema] = defaultRehypePlugins.sanitize as [
	typeof rehypeSanitize,
	SanitizeSchema,
];

export interface MarkdownExtensions {
	components?: Components;
	customElements?: CustomMarkdownElements;
	remend?: StreamdownProps['remend'];
	remarkPlugins?: StreamdownProps['remarkPlugins'];
	/** Additional plugins appended to the configured default rehype pipeline. */
	rehypePlugins?: StreamdownProps['rehypePlugins'];
	/** Additive extensions to the default sanitizer's allowlists. */
	sanitize?: Pick<SanitizeSchema, 'tagNames' | 'attributes' | 'protocols'>;
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
	rehypePlugins,
	sanitize,
}: MarkdownProps) {
	const custom = useMemo(
		() => resolveCustomElements(customElements),
		[customElements],
	);
	// Streamdown memoizes completed blocks by plugin identity. Keep the parsing
	// configuration stable while only the streamed text changes.
	const configuredRehypePlugins = useMemo(() => {
		const schema = extendSanitizerSchema(baseSanitizeSchema, sanitize, {
			tagNames: Object.keys(custom.allowedTags ?? {}),
			attributes: custom.allowedTags,
		});
		const configuredPlugins: typeof defaultRehypePlugins = {
			...defaultRehypePlugins,
			sanitize: [sanitizePlugin, schema],
		};
		return [...Object.values(configuredPlugins), ...(rehypePlugins ?? [])];
	}, [custom.allowedTags, rehypePlugins, sanitize]);
	const configuredRemarkPlugins = useMemo(
		() =>
			remarkPlugins ? [...baseRemarkPlugins, ...remarkPlugins] : undefined,
		[remarkPlugins],
	);

	return (
		<div className={className}>
			<Streamdown
				mode="streaming"
				plugins={plugins}
				rehypePlugins={configuredRehypePlugins}
				remarkPlugins={configuredRemarkPlugins}
				components={{
					...chromeComponents,
					...components,
					...custom.components,
				}}
				allowedTags={custom.allowedTags}
				controls={false}
				remend={remend}
			>
				{text}
			</Streamdown>
		</div>
	);
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
