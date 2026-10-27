import { ArrowUp, CornerDownLeft } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '@franklin/ui';
import { errorMessage } from '../controller/error.js';

type Props = {
	label?: string;
	placeholder?: string;
	compact?: boolean;
	onSubmit: (text: string) => void | Promise<void>;
};

export function Composer({
	label = 'Ask a question',
	placeholder = 'Ask a question…',
	compact = false,
	onSubmit,
}: Props) {
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string>();
	const [text, setText] = useState('');
	async function submit() {
		if (!text.trim() || submitting) return;
		setSubmitting(true);
		setError(undefined);
		try {
			await onSubmit(text.trim());
			setText('');
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setSubmitting(false);
		}
	}
	return (
		<form
			className={`study-composer ${compact ? 'study-composer-compact' : ''}`}
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
		>
			<textarea
				aria-label={label}
				placeholder={placeholder}
				value={text}
				disabled={submitting}
				rows={compact ? 1 : 2}
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
			<div className="study-composer-bottom">
				<span>
					<CornerDownLeft size={11} /> Send{' '}
					<span className="study-key-hint">· Shift + Enter for a new line</span>
				</span>
				<IconButton
					icon={ArrowUp}
					variant="outline"
					className="study-submit border-0 ring-1 ring-inset ring-input"
					type="submit"
					aria-label={compact ? 'Send follow-up' : 'Add question'}
					disabled={!text.trim() || submitting}
				/>
			</div>
			{error && (
				<p className="study-error" role="alert">
					{error}
				</p>
			)}
		</form>
	);
}
