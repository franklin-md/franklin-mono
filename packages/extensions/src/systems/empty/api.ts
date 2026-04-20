export type EmptyAPI = Record<never, never>;

export function emptyAPI(): EmptyAPI {
	return {};
}
