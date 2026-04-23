import { htmlResponse } from './response.js';
import type { ErrorOutcome, IgnoredOutcome, SuccessOutcome } from './types.js';

export function successOutcome(code: string): SuccessOutcome {
	return {
		kind: 'success',
		code,
		response: htmlResponse(
			200,
			'Authentication completed. You can close this window.',
		),
	};
}

export function errorOutcome(status: number, message: string): ErrorOutcome {
	return {
		kind: 'error',
		error: new Error(message),
		response: htmlResponse(status, message),
	};
}

export function ignoredOutcome(
	status: number,
	message: string,
): IgnoredOutcome {
	return {
		kind: 'ignore',
		response: htmlResponse(status, message),
	};
}
