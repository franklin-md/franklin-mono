import type { ExtraProps } from 'streamdown';

import { cn } from '../../../../lib/cn.js';
import { CopyButton } from '../../copy-button.js';

import { useHighlightedCode } from './highlight.js';

type CodeProps = React.JSX.IntrinsicElements['code'] &
	ExtraProps & { 'data-block'?: string };

export function Code({ 'data-block': dataBlock, ...props }: CodeProps) {
	if (!dataBlock) return <InlineCode {...props} />;
	return <FencedCode {...props} />;
}

function InlineCode({
	children,
	className,
	node: _node,
	...props
}: Omit<CodeProps, 'data-block'>) {
	return (
		<code
			className={cn(
				'rounded bg-muted px-1 py-0.5 font-mono text-[0.875em]',
				className,
			)}
			{...props}
		>
			{children}
		</code>
	);
}

function FencedCode({
	children,
	className,
	node: _node,
}: Omit<CodeProps, 'data-block'>) {
	const code = typeof children === 'string' ? children : '';
	const language = (className ?? '').replace(/^language-/, '') || 'text';
	const lines = useHighlightedCode(code, language);

	return (
		<div className="group/code relative my-2 overflow-x-auto rounded-md bg-sidebar p-4 text-sm">
			<div className="pointer-events-none absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover/code:opacity-100">
				<CopyButton
					text={code}
					className="pointer-events-auto h-6 w-6 p-1 text-muted-foreground hover:bg-transparent hover:text-foreground"
					iconClassName="h-full w-full"
				/>
			</div>
			<pre className="shiki whitespace-pre">
				<code>
					{lines
						? lines.map((line, i) => (
								<span key={i}>
									{line.map((token, j) => (
										<span key={j} style={token.style}>
											{token.content}
										</span>
									))}
									{i < lines.length - 1 && '\n'}
								</span>
							))
						: code}
				</code>
			</pre>
		</div>
	);
}
