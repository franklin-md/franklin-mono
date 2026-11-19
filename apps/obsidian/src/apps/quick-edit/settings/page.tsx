import { useId, useState, useSyncExternalStore } from 'react';
import { Button, cn, ModelPicker } from '@franklin/ui';
import { SettingControl } from '../../../shared/ui/setting/control.js';
import { SettingDescription } from '../../../shared/ui/setting/description.js';
import { settingFieldClassName } from '../../../shared/ui/setting/field.js';
import { SettingGroup } from '../../../shared/ui/setting/group.js';
import { SettingInfo } from '../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { SettingName } from '../../../shared/ui/setting/name.js';
import { SettingTextarea } from '../../../shared/ui/setting/textarea.js';
import { quickEditError } from '../error.js';
import type { QuickEditPreferences } from './store.js';
import type { QuickEditSettings } from '../types.js';
import { PresetSettings } from './presets/list.js';
import { quickEditSettingsSchema } from './schema.js';

type Props = {
	preferences: QuickEditPreferences;
	onConfigureShortcut?: () => void;
	active?: boolean;
};

export function QuickEditSettingsPanel({
	preferences,
	onConfigureShortcut,
	active = true,
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
		<>
			<SettingGroup
				title="Quick edit"
				description="Request edits directly inside a note. Changes use the file's existing review controls."
			>
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
									onSelect={(provider, model) => void save({ provider, model })}
									effort={{
										level: settings.reasoning,
										levels: quickEditSettingsSchema.shape.reasoning.options,
										onChange: (reasoning) => void save({ reasoning }),
									}}
								/>
							)}
						</fieldset>
					</SettingControl>
				</SettingItem>
				<SettingItem layout="stacked">
					<SettingInfo>
						<SettingName htmlFor={id}>Editing instructions</SettingName>
						<SettingDescription>
							Describe your outline and writing conventions. You can name
							instruction files for the agent to read.
						</SettingDescription>
					</SettingInfo>
					<form
						className="grid gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							void save({ instructions });
						}}
					>
						<SettingTextarea
							id={id}
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
				</SettingItem>
				{error && (
					<SettingItem>
						<p role="alert" className="text-[var(--text-error)]">
							{error}
						</p>
					</SettingItem>
				)}
			</SettingGroup>
			<PresetSettings preferences={preferences} />
			{onConfigureShortcut && (
				<SettingGroup title="Shortcut">
					<SettingItem>
						<SettingInfo>
							<SettingName>Quick edit</SettingName>
							<SettingDescription>
								Insert a quick edit prompt at the cursor in a Markdown note.
								Configure the keys in Obsidian’s hotkey editor.
							</SettingDescription>
						</SettingInfo>
						<SettingControl>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={onConfigureShortcut}
							>
								Configure quick edit shortcut
							</Button>
						</SettingControl>
					</SettingItem>
				</SettingGroup>
			)}
		</>
	);
}
