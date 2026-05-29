import { parseReferenceMention } from '@franklin/agent';
import { FileBadge } from '../../components/file-icon/badge.js';
import { isFileReference } from '../reference-mention/support.js';
import type { MarkdownExtensions } from '../turn/markdown.js';

import {
	REFERENCE_MENTION_ATTRIBUTE,
	REFERENCE_MENTION_ELEMENT_NAME,
	remarkReferenceMentions,
} from './remark.js';

interface ReferenceMentionElementProps {
	readonly reference: string;
}

function ReferenceMentionElement({ reference }: ReferenceMentionElementProps) {
	const parsed = parseReferenceMention(reference);
	if (!parsed || !isFileReference(parsed)) {
		// The shared UI mention renderer only supports filesystem references today.
		// Unsupported references should be left as text by the remark plugin; this
		// guard keeps hand-authored custom elements from rendering misleading file
		// badges.
		return null;
	}

	return (
		<FileBadge
			path={parsed.locator}
			className="mx-0.5 max-w-full py-0 align-baseline text-[0.8125rem]"
		/>
	);
}

export const referenceMentionMarkdown: MarkdownExtensions = {
	remarkPlugins: [remarkReferenceMentions],
	customElements: {
		[REFERENCE_MENTION_ELEMENT_NAME]: {
			allowedAttributes: [REFERENCE_MENTION_ATTRIBUTE],
			component: ReferenceMentionElement,
		},
	},
};
