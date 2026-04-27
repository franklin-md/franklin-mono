export interface ScrollableMetrics {
	clientHeight: number;
	scrollHeight: number;
	scrollTop: number;
}

export interface AtBottomOptions {
	bottomThresholdPx: number;
}

export function getScrollDistanceFromBottom(
	metrics: ScrollableMetrics,
): number {
	// scrollTop may be fractional while scrollHeight and clientHeight are rounded,
	// so bottom checks must use a threshold:
	// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight
	return metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop;
}

export function isAtBottom(
	metrics: ScrollableMetrics,
	options: AtBottomOptions,
): boolean {
	return getScrollDistanceFromBottom(metrics) <= options.bottomThresholdPx;
}
