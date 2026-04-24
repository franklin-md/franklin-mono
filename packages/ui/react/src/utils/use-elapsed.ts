import { useEffect, useState } from 'react';

/**
 * Returns the milliseconds elapsed since `startedAt`, ticking at the given
 * interval. Default tick is 1s — enough resolution for second-precision
 * displays without re-rendering on every animation frame.
 */
export function useElapsed(startedAt: number, intervalMs = 1000): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);
	return now - startedAt;
}
