import { forwardRef } from 'react';

import { cn } from '../../lib/cn.js';
import { Button, type ButtonProps } from '../../primitives/button.js';

export interface AuthButtonProps extends Omit<
	ButtonProps,
	'children' | 'variant' | 'size'
> {
	providerCount: number;
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
	function AuthButton({ providerCount, className, ...rest }, ref) {
		const isSignedIn = providerCount > 0;
		return (
			<Button
				ref={ref}
				variant="outline"
				size="sm"
				className={cn('gap-1.5 rounded-full', className)}
				{...rest}
			>
				<PersonIcon />
				{isSignedIn
					? `${providerCount} provider${providerCount > 1 ? 's' : ''}`
					: 'Sign in'}
			</Button>
		);
	},
);

function PersonIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
		</svg>
	);
}
