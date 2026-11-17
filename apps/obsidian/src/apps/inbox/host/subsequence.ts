export function subsequenceLength(left: string, right: string): number {
	const [short, long] =
		left.length <= right.length ? [left, right] : [right, left];
	if (long.includes(short)) return short.length;
	// LCS costs O(left.length * right.length) time, so passage navigation reserves
	// it for the fallback after exact/prefix matching. Only scores are needed:
	// one DP row uses O(min(left.length, right.length)) space, without an edit grid.
	const lengths = new Uint32Array(short.length + 1);
	for (let row = 0; row < long.length; row++) {
		let diagonal = 0;
		for (let column = 0; column < short.length; column++) {
			const previous = lengths[column + 1] ?? 0;
			lengths[column + 1] =
				long[row] === short[column]
					? diagonal + 1
					: Math.max(lengths[column] ?? 0, previous);
			diagonal = previous;
		}
	}
	return lengths[short.length] ?? 0;
}
