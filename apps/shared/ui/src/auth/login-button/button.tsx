import type { ComponentType, CSSProperties } from 'react';

import type { IconProps } from '@franklin/react';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { Button, type ButtonProps } from '../../primitives/button.js';

export interface LoginProviderButtonProps extends Omit<
	ButtonProps,
	'children' | 'variant'
> {
	icon: ComponentType<IconProps>;
	foreground: CSSProperties['color'];
	background: CSSProperties['background'];
	isLoading?: boolean;
	isSignedIn?: boolean;
}

export type ProviderLoginButtonProps = Omit<
	LoginProviderButtonProps,
	'icon' | 'foreground' | 'background'
>;

export function LoginProviderButton({
	icon: Icon,
	foreground,
	background,
	size = 'sm',
	isLoading = false,
	isSignedIn = false,
	className,
	style,
	disabled,
	...rest
}: LoginProviderButtonProps) {
	const label = isLoading
		? 'Signing in…'
		: isSignedIn
			? 'Logged in :)'
			: 'Sign in';

	return (
		<Button
			aria-busy={isLoading || undefined}
			className={cn('gap-2 hover:brightness-110', className)}
			disabled={disabled || isLoading}
			size={size}
			style={{ background, color: foreground, ...style }}
			{...rest}
		>
			{isLoading ? (
				<Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
			) : (
				<Icon aria-hidden="true" size={14} />
			)}
			<span>{label}</span>
		</Button>
	);
}
