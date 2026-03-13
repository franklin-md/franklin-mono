import { FileText } from 'lucide-react';

import type { Diff } from '@agentclientprotocol/sdk';
import { cn } from '@/lib/utils';

export interface DiffViewerProps {
	diff: Diff;
}

interface DiffLine {
	type: 'add' | 'remove' | 'context';
	content: string;
	oldNum?: number;
	newNum?: number;
}

function computeDiffLines(
	oldText: string | null | undefined,
	newText: string,
): DiffLine[] {
	const oldLines = (oldText ?? '').split('\n');
	const newLines = newText.split('\n');
	const lines: DiffLine[] = [];

	// Simple line-by-line diff: show removed lines then added lines
	// For a demo, this is sufficient — a full LCS diff would be overkill
	if (!oldText) {
		// Pure addition
		newLines.forEach((line, i) => {
			lines.push({ type: 'add', content: line, newNum: i + 1 });
		});
	} else {
		// Show old lines as removals, new lines as additions
		oldLines.forEach((line, i) => {
			lines.push({ type: 'remove', content: line, oldNum: i + 1 });
		});
		newLines.forEach((line, i) => {
			lines.push({ type: 'add', content: line, newNum: i + 1 });
		});
	}

	return lines;
}

export function DiffViewer({ diff }: DiffViewerProps) {
	const lines = computeDiffLines(diff.oldText, diff.newText);

	return (
		<div className="overflow-hidden rounded-lg border">
			{/* File header */}
			<div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs">
				<FileText className="h-3.5 w-3.5 text-muted-foreground" />
				<span className="font-mono text-foreground">{diff.path}</span>
			</div>

			{/* Diff lines */}
			<div className="overflow-x-auto">
				<pre className="text-xs leading-5">
					{lines.map((line, i) => (
						<div
							key={i}
							className={cn(
								'px-3',
								line.type === 'add' &&
									'bg-green-500/10 text-green-700 dark:text-green-400',
								line.type === 'remove' &&
									'bg-red-500/10 text-red-700 dark:text-red-400',
							)}
						>
							<span className="mr-3 inline-block w-4 select-none text-right text-muted-foreground">
								{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
							</span>
							{line.content}
						</div>
					))}
				</pre>
			</div>
		</div>
	);
}
