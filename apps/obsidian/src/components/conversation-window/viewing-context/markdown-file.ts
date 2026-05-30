export type ViewedMarkdownFile = {
	readonly path: string;
	readonly extension: 'md';
	readonly stat: {
		readonly mtime: number;
	};
};

// TODO(FRA-349): Account for more than viewed Markdown files, including PDFs
// with page context and websites.
export function toViewedMarkdownFile(
	value: unknown,
): ViewedMarkdownFile | null {
	if (!isRecord(value)) return null;
	if (typeof value.path !== 'string') return null;
	if (value.extension !== 'md') return null;
	if (!isRecord(value.stat)) return null;
	if (typeof value.stat.mtime !== 'number') return null;
	return {
		path: value.path,
		extension: 'md',
		stat: { mtime: value.stat.mtime },
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
