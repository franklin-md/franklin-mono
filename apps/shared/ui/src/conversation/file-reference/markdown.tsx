import { parseReferenceMention } from '@franklin/agent';
import { FileBadge } from '../../components/file-icon/badge.js';
import type { MarkdownExtensions } from '../turn/markdown.js';

import {
	FILE_REFERENCE_ATTRIBUTE,
	FILE_REFERENCE_ELEMENT_NAME,
	remarkFileReferences,
} from './remark.js';

interface FileReferenceElementProps {
	readonly reference: string;
}

function FileReferenceElement({ reference }: FileReferenceElementProps) {
	const parsed = parseReferenceMention(reference);
	if (!parsed) return null;

	return (
		<FileBadge
			path={parsed.locator}
			className="mx-0.5 max-w-full py-0 align-baseline text-[0.8125rem]"
		/>
	);
}

export const fileReferenceMarkdown: MarkdownExtensions = {
	remarkPlugins: [remarkFileReferences],
	customElements: {
		[FILE_REFERENCE_ELEMENT_NAME]: {
			allowedAttributes: [FILE_REFERENCE_ATTRIBUTE],
			component: FileReferenceElement,
		},
	},
};
