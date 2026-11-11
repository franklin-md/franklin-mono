import { Square } from 'lucide-react';

import { PromptAgentControl } from '@franklin/react';

import { Button } from '../../primitives/button.js';
import { PromptSubmitButton } from './prompt-submit-button.js';

export function SharedPromptAgentControl() {
	return (
		<PromptAgentControl
			send={<PromptSubmitButton />}
			cancel={
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 gap-1.5 rounded-lg bg-destructive/10 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-destructive ring-1 ring-inset ring-destructive/40 shadow-sm transition-colors hover:bg-destructive/20"
				>
					<Square className="h-3 w-3 fill-current" strokeWidth={2.4} />
					Esc
				</Button>
			}
		/>
	);
}
