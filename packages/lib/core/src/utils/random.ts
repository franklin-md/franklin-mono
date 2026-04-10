export function randomDelay([min, max]: [number, number]): number {
	return min + Math.floor(Math.random() * Math.max(0, max - min));
}
