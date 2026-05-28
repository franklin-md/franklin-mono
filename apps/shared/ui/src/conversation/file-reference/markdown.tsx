import type { ReactNode } from 'react';

import { FileBadge } from '../../components/file-icon/badge.js';
import type { MarkdownExtensions } from '../turn/markdown.js';

import {
	FILE_REFERENCE_ELEMENT_NAME,
	FILE_REFERENCE_PATH_ATTRIBUTE,
	remarkFileReferences,
} from './remark.js';

function FileReferenceElement({
	children: _children,
	node: _node,
	path,
}: Record<string, unknown> & { children?: ReactNode }) {
	const filePath = typeof path === 'string' ? path : undefined;
	if (!filePath) {
		return null;
	}

	return (
		<FileBadge
			path={filePath}
			className="mx-0.5 max-w-full py-0 align-baseline text-[0.8125rem]"
		/>
	);
}

export const fileReferenceMarkdown: MarkdownExtensions = {
	remarkPlugins: [remarkFileReferences],
	customElements: {
		[FILE_REFERENCE_ELEMENT_NAME]: {
			allowedAttributes: [FILE_REFERENCE_PATH_ATTRIBUTE],
			component: FileReferenceElement,
		},
	},
};
