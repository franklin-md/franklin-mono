export interface ScrollableMetrics {
	clientHeight: number;
	scrollHeight: number;
	scrollTop: number;
}

export interface AutoFollowOptions {
	bottomThresholdPx: number;
	escapeThresholdPx: number;
	following: boolean;
}

export function getScrollDistanceFromBottom(
	metrics: ScrollableMetrics,
): number {
	// scrollTop may be fractional while scrollHeight and clientHeight are rounded,
	// so bottom checks must use a threshold:
	// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight
	return metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop;
}

// Hysteresis: snap to following at the bottom, release once the user escapes
// past escapeThreshold, and keep the caller's previous decision in between.
export function isFollowing(
	metrics: ScrollableMetrics,
	options: AutoFollowOptions,
): boolean {
	const distance = getScrollDistanceFromBottom(metrics);
	if (distance <= options.bottomThresholdPx) return true;
	if (distance > options.escapeThresholdPx) return false;
	return options.following;
}
