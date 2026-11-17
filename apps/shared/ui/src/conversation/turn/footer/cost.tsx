interface TurnCostProps {
	amount: string;
}

export function TurnCost({ amount }: TurnCostProps) {
	return <span title="Turn cost (US cents)">{amount}</span>;
}
