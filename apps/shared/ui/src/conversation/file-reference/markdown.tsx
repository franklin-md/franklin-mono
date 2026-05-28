import { FileBadge } from '../../components/file-icon/badge.js';
import type { MarkdownExtensions } from '../turn/markdown.js';

import {
	FILE_REFERENCE_ELEMENT_NAME,
	FILE_REFERENCE_PATH_ATTRIBUTE,
	remarkFileReferences,
} from './remark.js';

interface FileReferenceElementProps {
	readonly path: string;
}

function FileReferenceElement({ path }: FileReferenceElementProps) {
	return (
		<FileBadge
			path={path}
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
