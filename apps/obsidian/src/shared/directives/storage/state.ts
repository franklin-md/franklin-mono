import type { JsonValue } from '@franklin/lib';
import { z } from 'zod';

export function copyDirectiveState(value: unknown): JsonValue {
	try {
		// Check cycles before recursive validation; z.json also rejects lossy JSON
		// values such as dates, undefined fields, functions, and non-finite numbers.
		const encoded = JSON.stringify(value);
		z.json().parse(value);
		return JSON.parse(encoded) as JsonValue;
	} catch {
		throw new Error('Directive state must be JSON-serializable');
	}
}
