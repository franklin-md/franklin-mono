import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { createMathPlugin } from '@streamdown/math';

import { chromeComponents } from './text/chrome/components.js';

const math = createMathPlugin({
	singleDollarTextMath: true,
});

const plugins = { code, math };

export function Markdown({ text }: { text: string }) {
	return (
		<div className="prose-content">
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
