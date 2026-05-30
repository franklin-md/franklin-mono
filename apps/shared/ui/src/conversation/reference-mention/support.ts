import type { Reference } from '@franklin/agent';

// TODO: Deduplicate this locator-scheme convention with the filesystem reference handler.
// This UI helper only decides whether a reference is renderable as today's file chip;
// the same path-like heuristic should eventually live in one reference-level helper.
export function isFileReference(reference: Reference): boolean {
	return !hasLocatorScheme(reference.locator);
}

function hasLocatorScheme(locator: string): boolean {
	return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(locator);
}
