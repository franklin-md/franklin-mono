import { BookOpenText } from 'lucide-react';

import { readPDFSpec, type ToolArgsOf } from '@franklin/agent';
import type { ToolRendererRegistryEntries } from '@franklin/react';

import { FileBadge } from '../../../components/file-icon/badge.js';
import { toolEntry } from '../entry.js';
import { ToolSummaryDetail } from '../summary.js';

type ReadPDFArgs = ToolArgsOf<typeof readPDFSpec>;

export const pdfToolRenderers = [
	toolEntry(readPDFSpec, BookOpenText, 'Read PDF', (args) => {
		const pageRange = formatPDFPageRange(args);

		return (
			<>
				<FileBadge path={args.path} iconExtension="pdf" />
				{pageRange && <ToolSummaryDetail>{pageRange}</ToolSummaryDetail>}
			</>
		);
	}),
] satisfies ToolRendererRegistryEntries;

function formatPDFPageRange(args: ReadPDFArgs): string | null {
	const startPage = args.start_page;
	const endPage = args.end_page;

	if (startPage === undefined && endPage === undefined) {
		return null;
	}

	if (endPage === undefined) {
		return `pages ${startPage ?? 1}+`;
	}

	const resolvedStartPage = startPage ?? 1;
	if (resolvedStartPage === endPage) {
		return `page ${resolvedStartPage}`;
	}

	return `pages ${resolvedStartPage}-${endPage}`;
}
