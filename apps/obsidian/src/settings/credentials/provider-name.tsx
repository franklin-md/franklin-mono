import type { ReactNode } from 'react';

import { ProviderIcon } from '@franklin/ui';

import { SettingName } from '../../components/obsidian-native/setting/name.js';

type Props = {
	provider: string;
	children: ReactNode;
};

export function ProviderName({ provider, children }: Props) {
	return (
		<SettingName>
			<span className="inline-flex items-center gap-2">
				<ProviderIcon
					aria-hidden="true"
					className="shrink-0"
					focusable="false"
					provider={provider}
					size={16}
				/>
				{children}
			</span>
		</SettingName>
	);
}
