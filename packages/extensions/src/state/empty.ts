export type EmptyState = Record<never, never>;

export function emptyState(): EmptyState {
	return {};
}
