import { useId, useState, useSyncExternalStore } from 'react';
import { Button, Label, ModelPicker } from '@franklin/ui';
import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { quickEditError } from '../error.js';
import type { QuickEditPreferences } from './store.js';
import type { QuickEditSettings } from '../types.js';
import { quickEditSettingsSchema } from './schema.js';

type Props = {
	preferences: QuickEditPreferences;
	onConfigureShortcut: () => void;
};

export function QuickEditSettingsPanel({
	preferences,
	onConfigureShortcut,
}: Props) {
	const id = useId();
	const settings = useSyncExternalStore(
		(notify) => preferences.state.subscribe(notify),
		() => preferences.state.get(),
	);
	const [instructions, setInstructions] = useState(settings.instructions);
	const [error, setError] = useState('');
	const [pending, setPending] = useState(false);
	async function save(update: Partial<QuickEditSettings>) {
		setPending(true);
		setError('');
		try {
			await preferences.configure(update);
		} catch (error) {
			setError(quickEditError(error));
		} finally {
			setPending(false);
		}
	}
	return (
		<SettingGroup
			title="Quick edit"
			description="Request edits directly inside a note. Changes use the file's existing review controls."
		>
			<div className="grid gap-3 py-3">
				<div className="flex flex-wrap items-center gap-3">
					<span>Model and reasoning</span>
					<fieldset disabled={pending}>
						<ModelPicker
							label="Quick edit model"
							provider={settings.provider}
							model={settings.model}
							onSelect={(provider, model) => void save({ provider, model })}
							effort={{
								level: settings.reasoning,
								levels: quickEditSettingsSchema.shape.reasoning.options,
								onChange: (reasoning) => void save({ reasoning }),
							}}
						/>
					</fieldset>
				</div>
				<form
					className="grid gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						void save({ instructions });
					}}
				>
					<Label htmlFor={id}>Editing instructions</Label>
					<p className="text-sm text-muted-foreground">
						Describe your outline and writing conventions. You can name
						instruction files for the agent to read.
					</p>
					<textarea
						id={id}
						className="w-full resize-y"
						rows={4}
						value={instructions}
						disabled={pending}
						onChange={(event) => setInstructions(event.target.value)}
					/>
					<div>
						<Button type="submit" size="sm" disabled={pending}>
							Save editing instructions
						</Button>
					</div>
				</form>
				<div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onConfigureShortcut}
					>
						Configure quick edit shortcut
					</Button>
				</div>
				{error && (
					<p role="alert" className="text-destructive">
						{error}
					</p>
				)}
			</div>
		</SettingGroup>
	);
}
