import {
	defaultRemarkPlugins,
	Streamdown,
	type Components,
	type StreamdownProps,
} from 'streamdown';
import { code } from '@streamdown/code';
import { createMathPlugin } from '@streamdown/math';

import { chromeComponents } from './text/chrome/components.js';

const math = createMathPlugin({
	singleDollarTextMath: true,
});

const plugins = { code, math };
const baseRemarkPlugins = Object.values(defaultRemarkPlugins);

export interface MarkdownExtensions {
	components?: Components;
	remarkPlugins?: StreamdownProps['remarkPlugins'];
}

export interface MarkdownProps extends MarkdownExtensions {
	text: string;
	className?: string;
}

function composeRemarkPlugins(
	remarkPlugins: MarkdownExtensions['remarkPlugins'],
) {
	return remarkPlugins ? [...baseRemarkPlugins, ...remarkPlugins] : undefined;
}

function composeComponents(components: MarkdownExtensions['components']) {
	return components ? { ...chromeComponents, ...components } : chromeComponents;
}

export function Markdown({
	text,
	className = 'prose-content',
	components,
	remarkPlugins,
}: MarkdownProps) {
	return (
		<div className={className}>
			<Streamdown
				plugins={plugins}
				remarkPlugins={composeRemarkPlugins(remarkPlugins)}
				components={composeComponents(components)}
				controls={false}
			>
				{text}
			</Streamdown>
		</div>
	);
}
