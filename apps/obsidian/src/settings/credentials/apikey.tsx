import { useApp, useAuthEntries, useAuthManager } from '@franklin/react';
import { Input, ProviderIcon } from '@franklin/ui';

import { SettingControl } from '../../components/obsidian-native/setting/control.js';
import { SettingDescription } from '../../components/obsidian-native/setting/description.js';
import { SettingInfo } from '../../components/obsidian-native/setting/info.js';
import { SettingItem } from '../../components/obsidian-native/setting/item.js';
import { SettingName } from '../../components/obsidian-native/setting/name.js';

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
	const app = useApp();
	const auth = useAuthManager();
	const { entries } = useAuthEntries();

	const value = entries[provider]?.apiKey?.key ?? '';
	const label = `${name} API key`;

	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>
					<span className="inline-flex items-center gap-2">
						<ProviderIcon
							aria-hidden="true"
							className="shrink-0"
							focusable="false"
							provider={provider}
							size={16}
						/>
						{label}
					</span>
				</SettingName>
				<SettingDescription>
					{description}{' '}
					<a
						href={linkUrl}
						target="_blank"
						rel="noreferrer"
						onClick={(event) => {
							event.preventDefault();
							void app.platform.os.openExternal(linkUrl);
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
