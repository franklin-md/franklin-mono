import { useState } from 'react';
import { Button } from '@franklin/ui';
import { SettingError } from '../../ui/setting/error.js';
import { SettingItem } from '../../ui/setting/item.js';
import { useRowSave } from '../../ui/setting/use-row-save.js';
import { createPreset } from '../create.js';
import type { PromptPreset } from '../types.js';
import { PresetEditor } from './editor/index.js';
import { PresetRow } from './row.js';

type Change = (current: PromptPreset[]) => PromptPreset[];

type Props = {
	// Names an entry in labels, such as "Add action" and "Action name".
	noun: string;
	presets: readonly PromptPreset[];
	// The owner applies each change to its latest list and persists it.
	onUpdate: (change: Change) => Promise<void>;
};

function swap(presets: PromptPreset[], id: string, offset: number) {
	const next = [...presets];
	const index = next.findIndex((preset) => preset.id === id);
	const other = next[index + offset];
	const preset = next[index];
	if (preset && other) {
		next[index] = other;
		next[index + offset] = preset;
	}
	return next;
}

function upsert(presets: PromptPreset[], preset: PromptPreset) {
	return presets.some((item) => item.id === preset.id)
		? presets.map((item) => (item.id === preset.id ? preset : item))
		: [...presets, preset];
}

// Saved presets as rows, then one editor that adds or edits. Render it inside
// the owner's SettingGroup, which names and describes the list.
export function PresetList({ noun, presets, onUpdate }: Props) {
	const [editing, setEditing] = useState<PromptPreset>();
	const { run: apply, pending, error } = useRowSave(onUpdate);
	function move(id: string, offset: number) {
		void apply((current) => swap(current, id, offset));
	}
	function remove(preset: PromptPreset) {
		void apply((current) =>
			current.filter((item) => item.id !== preset.id),
		).then((saved) => {
			if (saved && editing?.id === preset.id) setEditing(undefined);
		});
	}
	function save(preset: PromptPreset) {
		// A failed save keeps the editor open with its draft and reserved ID.
		void apply((current) => upsert(current, preset)).then((saved) => {
			if (saved) setEditing(undefined);
		});
	}
	return (
		<>
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
						noun={noun}
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
						onClick={() => setEditing(createPreset())}
					>
						{`Add ${noun}`}
					</Button>
				)}
			</SettingItem>
			{error && (
				<SettingItem>
					<SettingError>{error}</SettingError>
				</SettingItem>
			)}
		</>
	);
}
