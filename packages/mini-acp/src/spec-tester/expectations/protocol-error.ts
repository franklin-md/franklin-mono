import type {
	Expectation,
	TranscriptErrorOperation,
	TranscriptEntry,
} from '../types.js';

export function expectProtocolError(
	operation: TranscriptErrorOperation,
	message?: RegExp | string,
): Expectation {
	return {
		id: `expect-protocol-error-${operation}`,
		description: `protocol error is received for ${operation}`,
		test: (t) => {
			const errors = t.filter(
				(e): e is Extract<TranscriptEntry, { method: 'error' }> =>
					e.direction === 'receive' &&
					e.method === 'error' &&
					e.params.operation === operation,
			);
			if (errors.length === 0) return 'fail';
			if (!message) return 'pass';

			const last = errors.at(-1);
			if (!last) return 'fail';

			if (typeof message === 'string') {
				return last.params.message.includes(message) ? 'pass' : 'fail';
			}
			return message.test(last.params.message) ? 'pass' : 'fail';
		},
	};
}
