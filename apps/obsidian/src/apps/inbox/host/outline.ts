type Heading = { level: number; text: string };
type ListItem = { indent: number; text: string };

export function captureOutline(
	content: string,
	selectionLine: number,
): string[] {
	const headings: Heading[] = [];
	const parents: ListItem[] = [];
	const lines = content.split('\n');
	let fence: string | undefined;
	for (const line of lines.slice(0, selectionLine)) {
		const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
		if (marker) {
			if (!fence) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length)
				fence = undefined;
			continue;
		}
		if (fence) continue;
		const heading = /^\s{0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/.exec(line);
		if (heading) {
			const level = (heading[1] ?? '').length;
			while (headings.length && (headings.at(-1)?.level ?? 0) >= level)
				headings.pop();
			headings.push({ level, text: heading[2] ?? '' });
			parents.length = 0;
			continue;
		}
		const item = /^(\s*)(?:[-+*]|\d+[.)])\s+(.+)$/.exec(line);
		if (item) {
			const indent = (item[1] ?? '').replaceAll('\t', '    ').length;
			while (parents.length && (parents.at(-1)?.indent ?? 0) >= indent)
				parents.pop();
			parents.push({
				indent,
				text: (item[2] ?? '').replace(/^\[[ xX-]\]\s*/, ''),
			});
		} else if (line.trim() && !/^\s/.test(line)) {
			parents.length = 0;
		}
	}
	// Only strict ancestors of the selected list item belong in its breadcrumb.
	// Siblings can precede the selection even when far outside the text window.
	const selected = lines[selectionLine] ?? '';
	const item = /^(\s*)(?:[-+*]|\d+[.)])\s+/.exec(selected);
	if (item) {
		const indent = (item[1] ?? '').replaceAll('\t', '    ').length;
		while (parents.length && (parents.at(-1)?.indent ?? 0) >= indent)
			parents.pop();
	}
	return [
		...headings.map((heading) => heading.text),
		...parents.map((parent) => parent.text),
	];
}
