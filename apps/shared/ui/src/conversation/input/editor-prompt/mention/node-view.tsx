import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

import { FileBadge } from '../../../../components/file-icon/badge.js';
import { cn } from '../../../../lib/cn.js';

import { getMentionReference } from './node.js';

export function MentionNodeView({ node }: NodeViewProps) {
	const reference = getMentionReference(node.attrs);
	const path = reference?.locator ?? '';

	return (
		<NodeViewWrapper
			as="span"
			className={cn(
				'inline-flex h-5 max-w-[18rem] align-middle',
				'rounded-md bg-background/85 text-foreground ring-1 ring-inset ring-ring/60',
			)}
			data-file-path={path}
		>
			<FileBadge
				path={path}
				className="h-full max-w-full py-0 text-[0.8125rem] leading-5"
			/>
		</NodeViewWrapper>
	);
}
