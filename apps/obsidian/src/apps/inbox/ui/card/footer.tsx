import type { ReactNode } from 'react';

type Props = {
	id: string;
	focused: boolean;
	info: ReactNode;
	controls: ReactNode;
};

export function QuestionFooter({ id, focused, info, controls }: Props) {
	return (
		// Keep the footer mounted so per-question drafts and disclosures survive focus changes.
		<footer
			id={id}
			hidden={!focused}
			className="mt-4 space-y-4 animate-in fade-in-0 slide-in-from-top-1"
		>
			{info}
			{controls}
		</footer>
	);
}
