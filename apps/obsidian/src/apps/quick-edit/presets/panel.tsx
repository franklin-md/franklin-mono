import { CompactPopover, IconActionGroup } from '@franklin/ui';
import type { FloatingAnchor } from '@franklin/ui';
import type { QuickEditPreset } from './types.js';
import { presetColors } from './colors.js';
import { presetIcons } from './icons.js';

type Props = {
	anchor: FloatingAnchor;
	presets: readonly QuickEditPreset[];
	onSelect: (preset: QuickEditPreset) => void;
	onClose: (restoreFocus: boolean) => void;
	onContent?: (element: HTMLDivElement | null) => void;
};

export function PresetPanel({
	anchor,
	presets,
	onSelect,
	onClose,
	onContent,
}: Props) {
	return (
		<CompactPopover
			anchor={anchor}
			label="Quick edit presets"
			onClose={onClose}
			onContent={onContent}
		>
			{presets.length ? (
				<IconActionGroup
					label="Edit presets"
					actions={presets.map((preset) => ({
						...presetColors[preset.color],
						id: preset.id,
						label: preset.name,
						description: preset.prompt,
						icon: presetIcons[preset.icon].icon,
					}))}
					onAction={(id) => {
						const preset = presets.find((preset) => preset.id === id);
						if (preset) onSelect(preset);
					}}
				/>
			) : (
				<p className="m-0 max-w-64 px-3 py-2 text-sm">
					Add presets in Franklin settings → Quick edit.
				</p>
			)}
		</CompactPopover>
	);
}
