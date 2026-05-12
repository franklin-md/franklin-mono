const WIKILINK_OPEN = '[[';
const WIKILINK_CLOSE = ']]';
const WIKILINK_COMPLETION_PRIORITY = 19;

// Streaming-only completion can create a target that changes or disappears
// once more tokens arrive and the final wikilink is parsed.
export const remendObsidianWikilinks = {
	name: 'obsidianWikilinks',
	priority: WIKILINK_COMPLETION_PRIORITY,
	handle: completeIncompleteObsidianWikilink,
};

export function completeIncompleteObsidianWikilink(text: string) {
	const openIndex = findIncompleteWikilinkOpen(text);
	if (openIndex < 0) return text;

	return `${text}${WIKILINK_CLOSE}`;
}

function findIncompleteWikilinkOpen(text: string) {
	// Remend runs during streaming as a suffix repair, so only the rightmost
	// opener is eligible. Balancing every earlier opener would do more work on
	// each token and could reinterpret stable text that later tokens may resolve.
	const openIndex = text.lastIndexOf(WIKILINK_OPEN);
	if (openIndex < 0) return -1;
	if (text.indexOf(WIKILINK_CLOSE, openIndex + WIKILINK_OPEN.length) >= 0) {
		return -1;
	}

	const linktext = text.slice(openIndex + WIKILINK_OPEN.length);
	if (linktext.includes('\n')) return -1;
	if (isEscaped(text, openIndex)) return -1;
	if (isWithinMarkdownCode(text, openIndex)) return -1;

	return openIndex;
}

// TODO: I wonder if in the future we should have general implementation/algorithm that efficiently
// checks what type of markdown block you are in (i.e. returns flag for each block category)
// I wonder if this is already implemented?
// My current fear is that this is probably quite expensive
function isWithinMarkdownCode(text: string, position: number) {
	let inFence = false;
	let inInlineCode = false;

	for (let index = 0; index < position; index += 1) {
		if (text.startsWith('```', index) && !inInlineCode) {
			inFence = !inFence;
			index += 2;
			continue;
		}

		if (text[index] === '`' && !inFence && !isEscaped(text, index)) {
			inInlineCode = !inInlineCode;
		}
	}

	return inFence || inInlineCode;
}

function isEscaped(text: string, index: number) {
	let slashCount = 0;
	for (
		let cursor = index - 1;
		cursor >= 0 && text[cursor] === '\\';
		cursor -= 1
	) {
		slashCount += 1;
	}

	return slashCount % 2 === 1;
}
