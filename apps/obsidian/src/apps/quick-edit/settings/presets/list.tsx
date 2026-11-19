import { useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@franklin/ui';
import type { QuickEditPreferences } from '../store.js';
import type { QuickEditPreset } from '../../presets/types.js';
import { quickEditError } from '../../error.js';
import { SettingError } from '../../../../shared/ui/setting/error.js';
import { SettingGroup } from '../../../../shared/ui/setting/group.js';
import { SettingItem } from '../../../../shared/ui/setting/item.js';
import { PresetEditor } from './editor.js';
import { PresetRow } from './row.js';

type Props = { preferences: QuickEditPreferences };

export function PresetSettings({ preferences }: Props) {
	const presets = useSyncExternalStore(
		(notify) => preferences.state.subscribe(notify),
		() => preferences.state.get().presets,
	);
	const [editing, setEditing] = useState<QuickEditPreset>();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const saving = useRef(false);
	async function apply(
		change: (current: QuickEditPreset[]) => QuickEditPreset[],
	): Promise<boolean> {
		if (saving.current) return false;
		saving.current = true;
		setPending(true);
		setError('');
		try {
			await preferences.configure({
				presets: change(preferences.state.get().presets),
			});
			return true;
		} catch (error) {
			setError(quickEditError(error));
			return false;
		} finally {
			saving.current = false;
			setPending(false);
		}
	}
	function move(id: string, offset: number) {
		void apply((current) => {
			const next = [...current];
			const index = next.findIndex((preset) => preset.id === id);
			const other = next[index + offset];
			const preset = next[index];
			if (preset && other) {
				next[index] = other;
				next[index + offset] = preset;
			}
			return next;
		});
	}
	function remove(preset: QuickEditPreset) {
		void apply((current) =>
			current.filter((item) => item.id !== preset.id),
		).then((saved) => {
			if (saved && editing?.id === preset.id) setEditing(undefined);
		});
	}
	function save(preset: QuickEditPreset) {
		void apply((current) =>
			current.some((item) => item.id === preset.id)
				? current.map((item) => (item.id === preset.id ? preset : item))
				: [...current, preset],
		).then((saved) => {
			if (saved) setEditing(undefined);
		});
	}
	return (
		<SettingGroup
			title="Presets"
			description="Run a saved prompt from Franklin: Quick edit presets. Selected text or the current row supplies context."
		>
			{presets.map((preset, index) => (
				<PresetRow
					key={preset.id}
					preset={preset}
					pending={pending}
					first={index === 0}
					last={index === presets.length - 1}
					onMove={(offset) => move(preset.id, offset)}
					onEdit={() => setEditing(preset)}
					onRemove={() => remove(preset)}
				/>
			))}
			<SettingItem layout="stacked">
				{editing ? (
					<PresetEditor
						key={editing.id}
						preset={editing}
						pending={pending}
						onCancel={() => setEditing(undefined)}
						onSave={save}
					/>
				) : (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="self-start"
						disabled={pending}
						onClick={() =>
							setEditing({
								id: crypto.randomUUID(),
								name: '',
								prompt: '',
								icon: 'sparkles',
								color: 'blue',
							})
						}
					>
						Add preset
					</Button>
				)}
			</SettingItem>
			{error && (
				<SettingItem>
					<SettingError>{error}</SettingError>
				</SettingItem>
			)}
		</SettingGroup>
	);
}
