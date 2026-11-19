import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function SettingError({ children }: Props) {
	return (
		<p role="alert" className="text-destructive">
			{children}
		</p>
	);
}
