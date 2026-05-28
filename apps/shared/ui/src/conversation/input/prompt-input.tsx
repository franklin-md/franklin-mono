import { Children, type ReactNode } from 'react';

import { CornerDownLeft, Square } from 'lucide-react';

import { PromptAgentControl, PromptControls } from '@franklin/react';

import { Button } from '../../primitives/button.js';
import { TextareaGroup } from '../../components/textarea-group.js';

import { ModelSelector } from './model-selector/selector.js';
import { EditorPromptText } from './editor-prompt/editor.js';
import { ThinkingToggle } from './thinking-toggle.js';

export interface PromptInputProps {
	additionalControls?: ReactNode[];
}

export function PromptInput({ additionalControls }: PromptInputProps) {
	return (
		<div className="px-4 pb-4 pt-2">
			<TextareaGroup
				textarea={<EditorPromptText />}
				buttonBar={
					<PromptControls>
						<div className="flex w-full items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<ModelSelector />
								<ThinkingToggle />
								{Children.toArray(additionalControls)}
							</div>
							<PromptAgentControl
								send={
									<Button
										variant="ghost"
										size="sm"
										className="h-8 gap-1.5 rounded-lg bg-background/80 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-inset ring-ring/40 shadow-sm transition-colors hover:bg-background hover:text-foreground disabled:opacity-35"
									>
										<CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
										Enter
									</Button>
								}
								cancel={
									<Button
										variant="ghost"
										size="sm"
										className="h-8 gap-1.5 rounded-lg bg-destructive/10 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-destructive ring-1 ring-inset ring-destructive/40 shadow-sm transition-colors hover:bg-destructive/20"
									>
										<Square
											className="h-3 w-3 fill-current"
											strokeWidth={2.4}
										/>
										Esc
									</Button>
								}
							/>
						</div>
					</PromptControls>
				}
			/>
		</div>
	);
}
