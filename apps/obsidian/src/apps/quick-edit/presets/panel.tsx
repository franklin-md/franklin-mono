import { useMemo } from 'react';
import { CompactPopover, IconActionGroup } from '@franklin/ui';
import type { FloatingAnchor } from '@franklin/ui';
import { presetColors } from '../../../shared/preset/colors.js';
import type { PromptPreset } from '../../../shared/preset/types.js';
import { bindObsidianIcon } from '../../../shared/ui/icon/bind.js';

type Props = {
	anchor: FloatingAnchor;
	presets: readonly PromptPreset[];
	onSelect: (preset: PromptPreset) => void;
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
	// The chooser captures presets once per open, so icon components stay stable.
	const actions = useMemo(
		() =>
			presets.map((preset) => ({
				...presetColors[preset.color],
				id: preset.id,
				label: preset.name,
				description: preset.prompt,
				icon: bindObsidianIcon(preset.icon),
			})),
		[presets],
	);
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
					actions={actions}
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
