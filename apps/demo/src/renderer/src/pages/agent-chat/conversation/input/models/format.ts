export function formatContextWindow(tokens: number): string {
	if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
	return `${(tokens / 1_000).toFixed(0)}K`;
}

export function formatCost(costPerMillion: number): string {
	if (costPerMillion === 0) return 'Free';
	if (costPerMillion < 1) return `$${costPerMillion.toFixed(2)}`;
	return `$${costPerMillion.toFixed(0)}`;
}
