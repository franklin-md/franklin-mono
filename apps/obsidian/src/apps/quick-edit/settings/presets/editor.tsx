import { useId, useState } from 'react';
import { Button, Input, Label } from '@franklin/ui';
import type { QuickEditPreset } from '../../presets/types.js';
import { presetIcons } from '../../presets/icons.js';
import { presetColors } from '../../presets/colors.js';

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
			className="grid gap-2 rounded-md p-3 ring-1 ring-inset ring-border"
		>
			<fieldset
				disabled={pending}
				className="m-0 grid min-w-0 gap-2 border-0 p-0"
			>
				<Label htmlFor={`${id}-name`}>Preset name</Label>
				<Input
					id={`${id}-name`}
					value={draft.name}
					onChange={(event) => setDraft({ ...draft, name: event.target.value })}
				/>
				<Label htmlFor={`${id}-prompt`}>Prompt</Label>
				<textarea
					id={`${id}-prompt`}
					value={draft.prompt}
					rows={4}
					className="w-full resize-y"
					onChange={(event) =>
						setDraft({ ...draft, prompt: event.target.value })
					}
				/>
				<div className="flex flex-wrap items-end gap-3">
					<div className="grid gap-1">
						<Label htmlFor={`${id}-icon`}>Icon</Label>
						<select
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
						</select>
					</div>
					<div className="grid gap-1">
						<Label htmlFor={`${id}-color`}>Color</Label>
						<select
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
						</select>
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
