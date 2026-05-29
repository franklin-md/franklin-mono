export type ViewedMarkdownFile = {
	readonly path: string;
	readonly extension: 'md';
	readonly stat: {
		readonly mtime: number;
	};
};


// TODO: we should start accounting for more than just viewed markdown files, but also PDFs (along with pages) and websites.
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
