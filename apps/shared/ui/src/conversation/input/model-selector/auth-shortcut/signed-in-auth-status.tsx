import { CircleCheck } from 'lucide-react';

type Props = {
	displayName: string;
};

export function SignedInAuthStatus({ displayName }: Props) {
	const label = `Signed in to ${displayName}`;

	return (
		<span
			aria-label={label}
			className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
			title={label}
		>
			<CircleCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
		</span>
	);
}
