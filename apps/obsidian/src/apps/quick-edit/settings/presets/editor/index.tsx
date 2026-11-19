import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useForm, useSelector } from '@tanstack/react-form';
import { Button, ColorSwatches, Input } from '@franklin/ui';
import { presetColors } from '../../../presets/colors.js';
import { quickEditPresetSchema } from '../../../presets/schema.js';
import type { QuickEditPreset } from '../../../presets/types.js';
import { SettingName } from '../../../../../shared/ui/setting/name.js';
import { SettingTextarea } from '../../../../../shared/ui/setting/textarea.js';
import { AppearancePopover } from './appearance.js';
import { IconPicker } from './icon-picker.js';

type Props = {
	preset: QuickEditPreset;
	pending: boolean;
	onSave: (preset: QuickEditPreset) => void;
	onCancel: () => void;
};

const colorOptions = Object.entries(presetColors).map(([id, color]) => ({
	id,
	...color,
}));

function isPresetColor(id: string): id is QuickEditPreset['color'] {
	return Object.hasOwn(presetColors, id);
}

export function PresetEditor({ preset, pending, onSave, onCancel }: Props) {
	const id = useId();
	const [picking, setPicking] = useState(false);
	const form = useForm({
		defaultValues: preset,
		// onMount keeps Save disabled for a new, blank preset until it is valid.
		validators: {
			onMount: quickEditPresetSchema,
			onChange: quickEditPresetSchema,
		},
		onSubmit: ({ value }) => onSave(value),
	});
	const icon = useSelector(form.store, (state) => state.values.icon);
	const tint = useSelector(
		form.store,
		(state) => presetColors[state.values.color].colorClassName,
	);
	const canSubmit = useSelector(form.store, (state) => state.canSubmit);
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void form.handleSubmit();
	}
	return (
		<form aria-label="Edit preset" onSubmit={submit} className="grid gap-2">
			<fieldset
				disabled={pending}
				className="m-0 grid min-w-0 gap-2 border-0 p-0"
			>
				<SettingName htmlFor={`${id}-name`}>Preset name</SettingName>
				<div className="flex items-center gap-2">
					<AppearancePopover
						icon={icon}
						tint={tint}
						open={picking}
						onOpenChange={setPicking}
					>
						<form.Field name="icon">
							{(field) => (
								<IconPicker
									value={field.state.value}
									tint={tint}
									onChange={(next) => {
										field.handleChange(next);
										setPicking(false);
									}}
								/>
							)}
						</form.Field>
						<div role="separator" className="h-px bg-border" />
						<form.Field name="color">
							{(field) => (
								<div className="p-1">
									<ColorSwatches
										options={colorOptions}
										value={field.state.value}
										onChange={(next) => {
											if (isPresetColor(next)) field.handleChange(next);
										}}
									/>
								</div>
							)}
						</form.Field>
					</AppearancePopover>
					<form.Field name="name">
						{(field) => (
							<Input
								id={`${id}-name`}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						)}
					</form.Field>
				</div>
				<SettingName htmlFor={`${id}-prompt`}>Prompt</SettingName>
				<form.Field name="prompt">
					{(field) => (
						<SettingTextarea
							id={`${id}-prompt`}
							value={field.state.value}
							rows={4}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
					)}
				</form.Field>
				<div className="flex gap-2">
					<Button type="submit" size="sm" disabled={!canSubmit}>
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
