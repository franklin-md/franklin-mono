import { Icons } from '@franklin/react';

import { cn } from '../../lib/cn.js';

import {
	LoginProviderButton,
	type ProviderLoginButtonProps,
} from './button.js';

export function OpenAICodexLoginButton({
	className,
	...props
}: ProviderLoginButtonProps) {
	return (
		<LoginProviderButton
			background="#000"
			className={cn('ring-1 ring-inset ring-white/20', className)}
			foreground="#FFFFFF"
			icon={Icons.OpenAI}
			{...props}
		/>
	);
}
