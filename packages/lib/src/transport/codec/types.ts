/**
 * A codec transforms between raw and typed representations.
 *
 * `decode` is 1:N — a single raw chunk may produce zero or more typed values
 * (e.g. one Uint8Array chunk may contain multiple NDJSON lines).
 *
 * `encode` is 1:1 — each typed value produces exactly one raw chunk.
 */
export interface Codec<Raw, Typed> {
	decode(chunk: Raw): Typed[];
	encode(value: Typed): Raw;
}
