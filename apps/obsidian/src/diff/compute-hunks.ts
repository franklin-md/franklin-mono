import { diffLines, type Change } from 'diff';

export type HunkKind = 'insert' | 'delete' | 'replace';

export type HunkAnchor = {
	lineIndex: number;
	placement: 'before' | 'after';
};

export type Hunk = {
	id: string;
	kind: HunkKind;
	anchor: HunkAnchor;
	newFrom: number;
	newTo: number;
	newFromLine: number;
	newToLine: number;
	oldFrom: number;
	oldTo: number;
	oldFromLine: number;
	oldToLine: number;
	removedLines: string[];
	addedLines: string[];
};

export function computeHunks(oldContent: string, newContent: string): Hunk[] {
	const changes: Change[] = diffLines(oldContent, newContent);
	const hunks: Hunk[] = [];

	let newPos = 0;
	let oldPos = 0;
	let newLine = 0;
	let oldLine = 0;

	let i = 0;
	while (i < changes.length) {
		const c = changes[i];
		if (!c) break;
		if (!c.added && !c.removed) {
			newPos += c.value.length;
			oldPos += c.value.length;
			const lineDelta = c.count;
			newLine += lineDelta;
			oldLine += lineDelta;
			i++;
			continue;
		}

		const removedLines: string[] = [];
		const addedLines: string[] = [];
		const hunkNewFrom = newPos;
		const hunkOldFrom = oldPos;
		const hunkNewFromLine = newLine;
		const hunkOldFromLine = oldLine;

		while (i < changes.length) {
			const ch = changes[i];
			if (!ch || (!ch.added && !ch.removed)) break;
			const lines = splitChunk(ch.value);
			if (ch.removed) {
				removedLines.push(...lines);
				oldPos += ch.value.length;
				oldLine += ch.count;
			} else {
				addedLines.push(...lines);
				newPos += ch.value.length;
				newLine += ch.count;
			}
			i++;
		}

		const kind = getHunkKind(removedLines, addedLines);

		hunks.push({
			id: `${kind}:${hunkOldFrom}:${oldPos}`,
			kind,
			anchor: createAnchor(kind, newContent, hunkNewFrom, hunkNewFromLine),
			newFrom: hunkNewFrom,
			newTo: newPos,
			newFromLine: hunkNewFromLine,
			newToLine: newLine,
			oldFrom: hunkOldFrom,
			oldTo: oldPos,
			oldFromLine: hunkOldFromLine,
			oldToLine: oldLine,
			removedLines,
			addedLines,
		});
	}

	return hunks;
}

function splitChunk(value: string): string[] {
	const parts = value.split('\n');
	if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
	return parts;
}

function getHunkKind(removedLines: string[], addedLines: string[]): HunkKind {
	if (removedLines.length > 0 && addedLines.length > 0) return 'replace';
	if (removedLines.length > 0) return 'delete';
	return 'insert';
}

function createAnchor(
	kind: HunkKind,
	newContent: string,
	newFrom: number,
	newFromLine: number,
): HunkAnchor {
	if (newContent.length === 0) {
		return { lineIndex: 0, placement: 'before' };
	}

	if (kind === 'delete' && newFrom >= newContent.length) {
		return {
			lineIndex: Math.max(newFromLine - 1, 0),
			placement: 'after',
		};
	}

	return {
		lineIndex: newFromLine,
		placement: 'before',
	};
}
