import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { createMathPlugin } from '@streamdown/math';

const math = createMathPlugin({
	singleDollarTextMath: true,
});

const plugins = { code, math };

export function TextBlock({ text }: { text: string }) {
	return (
		<div className="prose-content text-sm">
			<Streamdown plugins={plugins}>{text}</Streamdown>
		</div>
	);
}
