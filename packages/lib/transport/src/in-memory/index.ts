import type { Pipe } from '../pipe.js';

export interface MemoryPipePair {
	/** One end of the pair (e.g., client). */
	pipeA: Pipe;
	/** Other end of the pair (e.g., agent). */
	pipeB: Pipe;
	/** Closes all streams, causing EOF on both sides. */
	dispose(): Promise<void>;
}

/**
 * Creates a cross-connected pair of in-memory byte pipes.
 *
 * pipeA.writable -> pipeB.readable
 * pipeB.writable -> pipeA.readable
 */
export function createMemoryPipes(): MemoryPipePair {
	const aToB = new TransformStream<Uint8Array>();
	const bToA = new TransformStream<Uint8Array>();

	const pipeA: Pipe = {
		writable: aToB.writable,
		readable: bToA.readable,
	};

	const pipeB: Pipe = {
		writable: bToA.writable,
		readable: aToB.readable,
	};

	return {
		pipeA,
		pipeB,
		async dispose() {
			await aToB.writable.close().catch(() => {});
			await bToA.writable.close().catch(() => {});
		},
	};
}
