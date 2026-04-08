import { CornerDownLeft } from 'lucide-react';

import { PromptControls, PromptSend, PromptText } from '@franklin/react';

import { AutoGrowTextarea } from '@/components/ui/auto-grow-textarea.js';
import { Button } from '@/components/ui/button.js';
import { TextareaGroup } from '@/components/ui/textarea-group.js';

import { ModelSelector } from './model-selector/model-selector.js';
import { ThinkingToggle } from './thinking-toggle.js';

export function PromptInput() {
	return (
		<div className="px-4 pb-4 pt-2">
			<TextareaGroup
				textarea={
					<PromptText>
						<AutoGrowTextarea
							className="flex-1 bg-transparent px-4 pt-4 pb-0 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
							minLines={2}
							maxLines={10}
							placeholder="Type a message..."
						/>
					</PromptText>
				}
				buttonBar={
					<PromptControls>
						<div className="flex w-full items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<ModelSelector />
								<ThinkingToggle />
							</div>
							<PromptSend>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 gap-1.5 rounded-lg bg-background/80 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-inset ring-ring/40 shadow-sm transition-colors hover:bg-background hover:text-foreground disabled:opacity-35"
								>
									<CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
									Enter
								</Button>
							</PromptSend>
						</div>
					</PromptControls>
				}
			/>
		</div>
	);
}
