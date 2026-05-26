import {
	useAuthEntries,
	useAuthManager,
	useOpenExternal,
} from '@franklin/react';
import { Input } from '@franklin/ui';

import { SettingControl } from '../../components/obsidian-native/setting/control.js';
import { SettingDescription } from '../../components/obsidian-native/setting/description.js';
import { SettingInfo } from '../../components/obsidian-native/setting/info.js';
import { SettingItem } from '../../components/obsidian-native/setting/item.js';
import { ProviderName } from './provider-name.js';

type ProviderApiKeyFieldProps = {
	provider: string;
	name: string;
	description: string;
	linkUrl: string;
	linkLabel: string;
	placeholder: string;
};

export function ProviderApiKeyField({
	provider,
	name,
	description,
	linkUrl,
	linkLabel,
	placeholder,
}: ProviderApiKeyFieldProps) {
	const auth = useAuthManager();
	const openExternal = useOpenExternal();
	const { entries } = useAuthEntries();

	const value = entries[provider]?.apiKey?.key ?? '';
	const label = `${name} API key`;

	return (
		<SettingItem>
			<SettingInfo>
				<ProviderName provider={provider}>{label}</ProviderName>
				<SettingDescription>
					{description}{' '}
					<a
						href={linkUrl}
						target="_blank"
						rel="noreferrer"
						onClick={(event) => {
							event.preventDefault();
							void openExternal(linkUrl);
						}}
					>
						{linkLabel}
					</a>
				</SettingDescription>
			</SettingInfo>
			<SettingControl>
				<Input
					aria-label={label}
					type="password"
					autoComplete="off"
					placeholder={placeholder}
					value={value}
					onChange={(event) => {
						const trimmed = event.currentTarget.value.trim();
						if (trimmed) {
							auth.setApiKeyEntry(provider, {
								type: 'apiKey',
								key: trimmed,
							});
						} else {
							auth.removeApiKeyEntry(provider);
						}
					}}
				/>
			</SettingControl>
		</SettingItem>
	);
}
