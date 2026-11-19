import { useId, useState } from 'react';
import { Button, Input } from '@franklin/ui';
import type { QuickEditPreset } from '../../presets/types.js';
import { presetIcons } from '../../presets/icons.js';
import { presetColors } from '../../presets/colors.js';
import { SettingName } from '../../../../shared/ui/setting/name.js';
import { SettingSelect } from '../../../../shared/ui/setting/select.js';
import { SettingTextarea } from '../../../../shared/ui/setting/textarea.js';

type Props = {
	preset: QuickEditPreset;
	pending: boolean;
	onSave: (preset: QuickEditPreset) => void;
	onCancel: () => void;
};

export function PresetEditor({ preset, pending, onSave, onCancel }: Props) {
	const id = useId();
	const [draft, setDraft] = useState(preset);
	const Icon = presetIcons[draft.icon].icon;
	return (
		<form
			aria-label="Edit preset"
			onSubmit={(event) => {
				event.preventDefault();
				onSave(draft);
			}}
			className="grid gap-2"
		>
			<fieldset
				disabled={pending}
				className="m-0 grid min-w-0 gap-2 border-0 p-0"
			>
				<SettingName htmlFor={`${id}-name`}>Preset name</SettingName>
				<Input
					id={`${id}-name`}
					value={draft.name}
					onChange={(event) => setDraft({ ...draft, name: event.target.value })}
				/>
				<SettingName htmlFor={`${id}-prompt`}>Prompt</SettingName>
				<SettingTextarea
					id={`${id}-prompt`}
					value={draft.prompt}
					rows={4}
					onChange={(event) =>
						setDraft({ ...draft, prompt: event.target.value })
					}
				/>
				<div className="flex flex-wrap items-end gap-3">
					<div className="grid gap-1">
						<SettingName htmlFor={`${id}-icon`}>Icon</SettingName>
						<SettingSelect
							id={`${id}-icon`}
							value={draft.icon}
							onChange={(event) => {
								const icon = event.target.value;
								if (icon in presetIcons)
									setDraft({ ...draft, icon: icon as QuickEditPreset['icon'] });
							}}
						>
							{Object.entries(presetIcons).map(([key, value]) => (
								<option key={key} value={key}>
									{value.label}
								</option>
							))}
						</SettingSelect>
					</div>
					<div className="grid gap-1">
						<SettingName htmlFor={`${id}-color`}>Color</SettingName>
						<SettingSelect
							id={`${id}-color`}
							value={draft.color}
							onChange={(event) => {
								const color = event.target.value;
								if (color in presetColors)
									setDraft({
										...draft,
										color: color as QuickEditPreset['color'],
									});
							}}
						>
							{Object.entries(presetColors).map(([key, value]) => (
								<option key={key} value={key}>
									{value.label}
								</option>
							))}
						</SettingSelect>
					</div>
					<Icon
						aria-hidden="true"
						className={`h-5 w-5 ${presetColors[draft.color].colorClassName}`}
					/>
				</div>
				<div className="flex gap-2">
					<Button
						type="submit"
						size="sm"
						disabled={!draft.name.trim() || !draft.prompt.trim()}
					>
						Save preset
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={onCancel}>
						Cancel
					</Button>
				</div>
			</fieldset>
		</form>
	);
}
