import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { createMathPlugin } from '@streamdown/math';

import { chromeComponents } from './text/chrome/components.js';

const math = createMathPlugin({
	singleDollarTextMath: true,
});

const plugins = { code, math };

export interface MarkdownProps {
	text: string;
	className?: string;
}

export function Markdown({ text, className = 'prose-content' }: MarkdownProps) {
	return (
		<div className={className}>
			<Streamdown
				plugins={plugins}
				components={chromeComponents}
				controls={false}
			>
				{text}
			</Streamdown>
		</div>
	);
}
