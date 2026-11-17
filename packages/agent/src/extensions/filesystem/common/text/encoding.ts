/**
 * Decode raw bytes into a string, stripping a UTF-8 BOM if present.
 *
 * Returns the BOM separately so it can be restored on write.
 * LLMs never include the invisible BOM in tool arguments, so we
 * strip it before matching and re-prepend on write.
 */
export function decode(bytes: Uint8Array): { bom: string; text: string } {
	const raw = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
	if (raw.startsWith('\uFEFF')) {
		return { bom: '\uFEFF', text: raw.slice(1) };
	}
	return { bom: '', text: raw };
}
