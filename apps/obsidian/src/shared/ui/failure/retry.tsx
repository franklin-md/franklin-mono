import { RotateCcw } from 'lucide-react';
import { Button } from '@franklin/ui';

type Props = {
	onClick: () => void;
	label?: string;
	'aria-label'?: string;
};

export function RetryButton({ onClick, label = 'Retry', ...rest }: Props) {
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="gap-1.5"
			onClick={onClick}
			{...rest}
		>
			<RotateCcw className="size-3.5" aria-hidden="true" />
			{label}
		</Button>
	);
}
