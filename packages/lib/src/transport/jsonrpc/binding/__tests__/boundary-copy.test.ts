import { describe, expect, it } from 'vitest';
import { event, method, namespace } from '@franklin/lib';
import type { JsonRpcMessage } from '../../types.js';
import { createDuplexPair } from '../../../in-memory/index.js';

import { bindJsonRpcClient, bindJsonRpcServer } from '../index.js';

const serverDescriptor = namespace({
	inspect:
		method<
			(params: {
				readonly items: string[];
			}) => Promise<{ readonly items: string[] }>
		>(),
	stream:
		event<
			(params: {
				readonly topic: string[];
			}) => AsyncIterable<{ readonly items: string[] }>
		>(),
});

const clientDescriptor = namespace({});

function createBoundPeers(handlers: {
	inspect(params: { readonly items: string[] }): Promise<{
		readonly items: string[];
	}>;
	stream(params: { readonly topic: string[] }): AsyncIterable<{
		readonly items: string[];
	}>;
}) {
	const { a, b } = createDuplexPair<JsonRpcMessage>();

	const clientBinding = bindJsonRpcClient({
		duplex: a,
		server: serverDescriptor,
		client: clientDescriptor,
	});
	const serverBinding = bindJsonRpcServer({
		duplex: b,
		server: serverDescriptor,
		client: clientDescriptor,
	});

	const clientHandle = clientBinding.bind({});
	const serverHandle = serverBinding.bind(handlers);

	return {
		client: clientBinding.remote,
		async close() {
			await Promise.allSettled([clientHandle.close(), serverHandle.close()]);
		},
	};
}

describe('JSON-RPC boundary cloning', () => {
	// Without a clone at the RPC boundary, local in-memory peers share nested
	// arrays and objects by reference. That leaks mutation across sides and, in
	// Mini-ACP, can alias `history.messages` between app and agent trackers.
	it('clones request params and method results across local peers', async () => {
		let seenParams:
			| {
					readonly items: string[];
			  }
			| undefined;
		let returnedResult:
			| {
					readonly items: string[];
			  }
			| undefined;

		const peers = createBoundPeers({
			async inspect(params) {
				seenParams = params;
				returnedResult = { items: ['server'] };
				return returnedResult;
			},
			async *stream() {},
		});

		const payload = { items: ['client'] };
		const resultPromise = peers.client.inspect(payload);
		payload.items.push('mutated-after-send');

		const result = await resultPromise;

		expect(seenParams).toEqual({ items: ['client'] });
		expect(seenParams).not.toBe(payload);
		expect(seenParams!.items).not.toBe(payload.items);

		expect(result).toEqual({ items: ['server'] });
		expect(result).not.toBe(returnedResult);
		expect(result.items).not.toBe(returnedResult!.items);

		await peers.close();
	});

	it('clones streamed event payloads across local peers', async () => {
		let emitted:
			| {
					readonly items: string[];
			  }
			| undefined;

		const peers = createBoundPeers({
			async inspect() {
				return { items: [] };
			},
			async *stream() {
				emitted = { items: ['stream-update'] };
				yield emitted;
			},
		});

		const iterable = peers.client.stream({ topic: ['topic'] });
		const iterator = iterable[Symbol.asyncIterator]();
		const first = await iterator.next();

		expect(first.done).toBe(false);
		if (first.done) {
			throw new Error('Expected a streamed update');
		}
		expect(first.value).toEqual({ items: ['stream-update'] });
		expect(first.value).not.toBe(emitted);
		expect(first.value.items).not.toBe(emitted!.items);

		await peers.close();
	});
});
