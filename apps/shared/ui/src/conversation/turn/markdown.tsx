import {
	defaultRemarkPlugins,
	Streamdown,
	type Components,
	type StreamdownProps,
} from 'streamdown';
import { code } from '@streamdown/code';
import { createMathPlugin } from '@streamdown/math';
import type { ComponentType } from 'react';

import { chromeComponents } from './text/chrome/components.js';

const math = createMathPlugin({
	singleDollarTextMath: true,
});

const plugins = { code, math };
const baseRemarkPlugins = Object.values(defaultRemarkPlugins);

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
				remarkPlugins={
					remarkPlugins ? [...baseRemarkPlugins, ...remarkPlugins] : undefined
				}
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
