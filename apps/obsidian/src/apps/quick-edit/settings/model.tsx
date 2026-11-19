import { THINKING_LEVELS } from '@franklin/mini-acp';
import { cn, ModelPicker } from '@franklin/ui';
import { SettingControl } from '../../../shared/ui/setting/control.js';
import { SettingDescription } from '../../../shared/ui/setting/description.js';
import { settingFieldClassName } from '../../../shared/ui/setting/field.js';
import { SettingInfo } from '../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { SettingName } from '../../../shared/ui/setting/name.js';
import type { QuickEditSettings } from '../types.js';

type Props = {
	settings: QuickEditSettings;
	pending: boolean;
	active: boolean;
	onSave: (update: Partial<QuickEditSettings>) => Promise<void>;
};

export function QuickEditModelSetting({
	settings,
	pending,
	active,
	onSave,
}: Props) {
	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>Model and reasoning</SettingName>
				<SettingDescription>Used for new quick edits.</SettingDescription>
			</SettingInfo>
			<SettingControl>
				<fieldset
					disabled={pending}
					aria-label="Quick edit model and reasoning"
					className="m-0 min-w-0 border-0 p-0"
				>
					{active && (
						<ModelPicker
							label="Quick edit model"
							className={cn(settingFieldClassName, 'h-8 px-3')}
							provider={settings.provider}
							model={settings.model}
							onSelect={(provider, model) => void onSave({ provider, model })}
							effort={{
								level: settings.reasoning,
								levels: THINKING_LEVELS,
								onChange: (reasoning) => void onSave({ reasoning }),
							}}
						/>
					)}
				</fieldset>
			</SettingControl>
		</SettingItem>
	);
}
