import { Icons } from '@franklin/react';

import {
	LoginProviderButton,
	type ProviderLoginButtonProps,
} from './button.js';

export function AnthropicLoginButton(props: ProviderLoginButtonProps) {
	return (
		<LoginProviderButton
			background="#181818"
			foreground="#D97757"
			icon={Icons.Claude}
			{...props}
		/>
	);
}
