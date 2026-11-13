import type { Usage } from '@franklin/mini-acp';

interface TurnCostProps {
	usage: Usage | undefined;
}

const centsFormatter = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
});

export function TurnCost({ usage }: TurnCostProps) {
	const cost = usage?.cost;
	if (
		!cost ||
		!Number.isFinite(cost.total) ||
		cost.total < 0 ||
		(cost.total === 0 && !cost.totalFromProvider)
	) {
		return null;
	}
	const cents = cost.total * 100;
	const amount = cents < 0.1 ? '<0.1¢' : `${centsFormatter.format(cents)}¢`;
	return (
		<>
			<span aria-hidden>·</span>
			<span
				title={
					cost.totalFromProvider
						? 'Provider-reported cost (US cents)'
						: 'Estimated cost (US cents)'
				}
			>
				{cost.totalFromProvider ? amount : `~${amount}`}
			</span>
		</>
	);
}
