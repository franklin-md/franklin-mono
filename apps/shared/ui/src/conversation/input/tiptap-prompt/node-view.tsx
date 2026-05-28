import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

import { FileBadge } from '../../../components/file-icon/badge.js';
import { cn } from '../../../lib/cn.js';

import { getFileMentionPath } from './file-mention-node.js';

export function FileMentionNodeView({ node }: NodeViewProps) {
	const path = getFileMentionPath(node.attrs);

	return (
		<NodeViewWrapper
			as="span"
			className={cn(
				'inline-flex max-w-[18rem] align-baseline',
				'rounded-md bg-background/85 text-foreground ring-1 ring-inset ring-ring/60',
			)}
			data-file-path={path}
		>
			<FileBadge path={path} className="max-w-full py-0 text-[0.8125rem]" />
		</NodeViewWrapper>
	);
}
