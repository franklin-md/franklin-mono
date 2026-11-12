import { useRef, useState, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@franklin/ui';
import type { QuickEditPreferences } from '../store.js';
import type { QuickEditPreset } from '../../presets/types.js';
import { presetIcons } from '../../presets/icons.js';
import { presetColors } from '../../presets/colors.js';
import { quickEditError } from '../../error.js';
import { PresetEditor } from './editor.js';

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
	return (
		<section aria-label="Quick edit presets" className="grid gap-2">
			<h3 className="m-0 text-sm font-medium">Presets</h3>
			<p className="m-0 text-sm text-muted-foreground">
				Run a saved prompt from Franklin: Quick edit presets. Selected text or
				the current row supplies context.
			</p>
			{presets.map((preset, index) => {
				const Icon = presetIcons[preset.icon].icon;
				return (
					<div key={preset.id} className="flex items-center gap-2">
						<Icon
							aria-hidden="true"
							className={`h-4 w-4 shrink-0 ${presetColors[preset.color].colorClassName}`}
						/>
						<span className="min-w-0 flex-1 truncate">{preset.name}</span>
						<IconButton
							icon={ArrowUp}
							aria-label={`Move ${preset.name} up`}
							disabled={pending || index === 0}
							onClick={() => move(preset.id, -1)}
						/>
						<IconButton
							icon={ArrowDown}
							aria-label={`Move ${preset.name} down`}
							disabled={pending || index === presets.length - 1}
							onClick={() => move(preset.id, 1)}
						/>
						<IconButton
							icon={Pencil}
							aria-label={`Edit ${preset.name}`}
							disabled={pending}
							onClick={() => setEditing(preset)}
						/>
						<IconButton
							icon={Trash2}
							aria-label={`Delete ${preset.name}`}
							disabled={pending}
							onClick={() => {
								void apply((current) =>
									current.filter((item) => item.id !== preset.id),
								).then((saved) => {
									if (saved && editing?.id === preset.id) setEditing(undefined);
								});
							}}
						/>
					</div>
				);
			})}
			{editing ? (
				<PresetEditor
					key={editing.id}
					preset={editing}
					pending={pending}
					onCancel={() => setEditing(undefined)}
					onSave={(preset) => {
						void apply((current) =>
							current.some((item) => item.id === preset.id)
								? current.map((item) => (item.id === preset.id ? preset : item))
								: [...current, preset],
						).then((saved) => {
							if (saved) setEditing(undefined);
						});
					}}
				/>
			) : (
				<div>
					<Button
						type="button"
						variant="outline"
						size="sm"
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
				</div>
			)}
			{error && (
				<p role="alert" className="text-destructive">
					{error}
				</p>
			)}
		</section>
	);
}
