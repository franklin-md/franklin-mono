const centsFormatter = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
});

export function formatTurnCost(total: number | undefined): string | undefined {
	if (total === undefined || !Number.isFinite(total) || total < 0) {
		return undefined;
	}
	if (total === 0) return '0¢';
	const cents = total * 100;
	return cents < 0.1 ? '< 0.1¢' : `${centsFormatter.format(cents)}¢`;
}
