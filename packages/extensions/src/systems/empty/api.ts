export type EmptyAPI = Record<string, never>;

export function emptyAPI(): EmptyAPI {
	return {};
}
