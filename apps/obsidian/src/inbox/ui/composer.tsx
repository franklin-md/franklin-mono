import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
	AutoGrowTextarea,
	PromptFooter,
	PromptFooterControls,
	PromptSubmitButton,
	PromptSurface,
	cn,
} from '@franklin/ui';
import { errorMessage } from '../controller/error.js';

type Props = {
	label?: string;
	placeholder?: string;
	compact?: boolean;
	controls?: ReactNode;
	onSubmit: (text: string) => void | Promise<void>;
};

export function Composer({
	label = 'Ask a question',
	placeholder = 'Ask a question…',
	compact = false,
	controls,
	onSubmit,
}: Props) {
	const [submitting, setSubmitting] = useState(false);
	const pending = useRef(false);
	const [error, setError] = useState<string>();
	const [text, setText] = useState('');
	async function submit() {
		if (!text.trim() || pending.current) return;
		// Guard before React rerenders: Enter and a button click may arrive together.
		pending.current = true;
		setSubmitting(true);
		setError(undefined);
		try {
			await onSubmit(text.trim());
			setText('');
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			pending.current = false;
			setSubmitting(false);
		}
	}
	const send = (
		<PromptSubmitButton
			compact={compact}
			type="submit"
			aria-label={compact ? 'Send follow-up' : 'Add question'}
			disabled={!text.trim() || submitting}
		/>
	);
	return (
		<PromptSurface
			asChild
			className={cn(
				compact &&
					'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2.5 py-2',
			)}
		>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<div className="min-w-0">
					<AutoGrowTextarea
						aria-label={label}
						aria-description="Enter to send. Shift+Enter for a new line."
						placeholder={placeholder}
						value={text}
						disabled={submitting}
						minLines={compact ? 1 : 2}
						maxLines={8}
						className={cn(
							'rounded-none focus-visible:ring-0',
							compact
								? 'min-h-6 p-0 text-xs leading-6'
								: 'px-4 pt-3 pb-0 text-[13px] leading-6',
						)}
						onChange={(event) => setText(event.target.value)}
						onKeyDown={(event) => {
							if (
								event.key === 'Enter' &&
								!event.shiftKey &&
								!event.nativeEvent.isComposing
							) {
								event.preventDefault();
								void submit();
							}
						}}
					/>
				</div>
				<PromptFooter className={compact ? 'p-0' : 'px-3 pb-2'}>
					{compact ? (
						send
					) : (
						<PromptFooterControls className="flex-wrap gap-2">
							{controls}
							{send}
						</PromptFooterControls>
					)}
				</PromptFooter>
				{error && (
					<p className="study-error col-span-full px-3 pb-2" role="alert">
						{error}
					</p>
				)}
			</form>
		</PromptSurface>
	);
}
