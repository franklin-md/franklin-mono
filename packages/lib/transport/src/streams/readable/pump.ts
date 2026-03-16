/**
 * Consumes a ReadableStream by calling fn for each value.
 * Resolves when the stream closes or errors.
 */
export async function pump<T>(
	readable: ReadableStream<T>,
	fn: (value: T) => void,
): Promise<void> {
	const reader = readable.getReader();
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			fn(value);
		}
	} catch {
		// Stream closed or errored
	} finally {
		reader.releaseLock();
	}
}
