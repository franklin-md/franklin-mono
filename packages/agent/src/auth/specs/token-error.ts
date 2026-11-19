/**
 * A rejected token-endpoint request. The message carries the provider's own
 * sentence rather than the raw response body; `status` lets callers tell a
 * rejected credential from an outage.
 */
export class TokenRequestError extends Error {
	private constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = 'TokenRequestError';
	}

	static fromResponse(
		providerLabel: string,
		status: number,
		bodyText: string,
	): TokenRequestError {
		return new TokenRequestError(
			status,
			`${providerLabel} token request failed (${status}): ${describeBody(bodyText)}`,
		);
	}
}

// Token endpoints report `{ error, error_description }` (RFC 6749 §5.2), and
// OpenAI nests `{ error: { message, code } }`. Other bodies are kept as-is.
// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
function describeBody(bodyText: string): string {
	let data: unknown;
	try {
		data = JSON.parse(bodyText);
	} catch {
		return bodyText;
	}
	if (typeof data !== 'object' || data === null) return bodyText;
	const { error, error_description } = data as {
		error?: unknown;
		error_description?: unknown;
	};
	if (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof error.message === 'string'
	)
		return error.message;
	if (typeof error_description === 'string') return error_description;
	if (typeof error === 'string') return error;
	return bodyText;
}
