import type { ReactNode } from 'react';
import { THINKING_LEVELS } from '@franklin/mini-acp';
import { cn, ModelPicker } from '@franklin/ui';
import type { ModelSelection } from '../../model/selection.js';
import { SettingControl } from './control.js';
import { SettingDescription } from './description.js';
import { settingFieldClassName } from './field.js';
import { SettingInfo } from './info.js';
import { SettingItem } from './item.js';
import { SettingName } from './name.js';

type Props = {
	// Names the picker, such as "Inbox model".
	label: string;
	description: ReactNode;
	value: ModelSelection;
	pending: boolean;
	// Hidden settings sections stay mounted. Unmount the picker so its
	// portalled popover closes when the section is switched away.
	active: boolean;
	onChange: (update: Partial<ModelSelection>) => void;
};

export function ModelSetting({
	label,
	description,
	value,
	pending,
	active,
	onChange,
}: Props) {
	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>Model and reasoning</SettingName>
				<SettingDescription>{description}</SettingDescription>
			</SettingInfo>
			<SettingControl>
				<fieldset
					disabled={pending}
					aria-label={`${label} and reasoning`}
					className="m-0 min-w-0 border-0 p-0"
				>
					{active && (
						<ModelPicker
							label={label}
							className={cn(settingFieldClassName, 'h-8 px-3')}
							value={{ provider: value.provider, model: value.model }}
							onChange={onChange}
							effort={{
								value: value.reasoning,
								levels: THINKING_LEVELS,
								onChange: (reasoning) => onChange({ reasoning }),
							}}
						/>
					)}
				</fieldset>
			</SettingControl>
		</SettingItem>
	);
}
