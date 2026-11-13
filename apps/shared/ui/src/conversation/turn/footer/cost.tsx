import type { Usage } from '@franklin/mini-acp';

interface TurnCostProps {
	usage: Usage | undefined;
}

export function TurnCost({ usage }: TurnCostProps) {
	const cost = usage?.cost;
	if (
		!cost ||
		!Number.isFinite(cost.total) ||
		cost.total < 0 ||
		(cost.total === 0 && !cost.totalFromProvider)
	) {
		return <span>Cost unavailable</span>;
	}
	const amount =
		cost.total > 0 && cost.total < 0.0001
			? '<$0.0001'
			: `$${cost.total.toFixed(4)}`;
	return (
		<span
			title={
				cost.totalFromProvider
					? 'Provider-reported cost (USD)'
					: 'Estimated cost (USD)'
			}
		>
			{cost.totalFromProvider ? amount : `~${amount}`}
		</span>
	);
}
