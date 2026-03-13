import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import { cn } from '@/lib/utils';

export interface MarkdownContentProps {
	text: string;
	className?: string;
}

function InlineCode({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLElement>) {
	return (
		<code
			className={cn(
				'rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono',
				className,
			)}
			{...props}
		>
			{children}
		</code>
	);
}

function FencedCodeBlock({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLElement> & { className: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		const text =
			typeof children === 'string' ? children.replace(/\n$/, '') : '';
		void navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [children]);

	const lang = className.replace('language-', '');

	return (
		<div className="group relative my-2 rounded-lg border bg-muted/50">
			<div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
				<span className="font-mono">{lang || 'code'}</span>
				<button
					onClick={handleCopy}
					className="flex items-center gap-1 rounded px-1.5 py-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
				>
					{copied ? (
						<>
							<Check className="h-3 w-3" />
							Copied
						</>
					) : (
						<>
							<Copy className="h-3 w-3" />
							Copy
						</>
					)}
				</button>
			</div>
			<pre className="overflow-x-auto p-3">
				<code className={cn('text-sm', className)} {...props}>
					{children}
				</code>
			</pre>
		</div>
	);
}

function CodeBlock(props: React.HTMLAttributes<HTMLElement>) {
	if (!props.className) {
		return <InlineCode {...props} />;
	}
	return <FencedCodeBlock {...props} className={props.className} />;
}

function PreBlock({ children }: React.HTMLAttributes<HTMLPreElement>) {
	// Unwrap the <pre> wrapper so CodeBlock handles its own <pre>
	return <>{children}</>;
}

export function MarkdownContent({ text, className }: MarkdownContentProps) {
	return (
		<div className={cn('prose-content', className)}>
			<Markdown
				rehypePlugins={[rehypeHighlight]}
				components={{
					code: CodeBlock,
					pre: PreBlock,
				}}
			>
				{text}
			</Markdown>
		</div>
	);
}
