import { ForkButton } from '../../../agent-selector/fork-button.js';

import { CopyButton } from '../copy-button.js';

export interface TurnFooterActionsProps {
	assistantText: string;
	hasCopy: boolean;
	hasFork: boolean;
}

export function TurnFooterActions({
	assistantText,
	hasCopy,
	hasFork,
}: TurnFooterActionsProps) {
	return (
		<div className="flex items-center gap-0.5">
			{hasCopy ? (
				<CopyButton text={assistantText} label="Copy message" />
			) : null}
			{hasFork ? <ForkButton /> : null}
		</div>
	);
}
