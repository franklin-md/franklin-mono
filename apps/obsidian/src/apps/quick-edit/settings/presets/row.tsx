import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '@franklin/ui';
import type { QuickEditPreset } from '../../presets/types.js';
import { presetColors } from '../../presets/colors.js';
import { ObsidianIcon } from '../../../../shared/ui/icon/index.js';
import { SettingControl } from '../../../../shared/ui/setting/control.js';
import { SettingInfo } from '../../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../../shared/ui/setting/item.js';
import { SettingName } from '../../../../shared/ui/setting/name.js';

type Props = {
	preset: QuickEditPreset;
	pending: boolean;
	first: boolean;
	last: boolean;
	onMove: (offset: number) => void;
	onEdit: () => void;
	onRemove: () => void;
};

export function PresetRow({
	preset,
	pending,
	first,
	last,
	onMove,
	onEdit,
	onRemove,
}: Props) {
	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>
					<span className="inline-flex min-w-0 items-center gap-2">
						<ObsidianIcon
							id={preset.icon}
							className={`h-4 w-4 ${presetColors[preset.color].colorClassName}`}
						/>
						<span className="truncate">{preset.name}</span>
					</span>
				</SettingName>
			</SettingInfo>
			<SettingControl>
				<IconButton
					icon={ArrowUp}
					aria-label={`Move ${preset.name} up`}
					disabled={pending || first}
					onClick={() => onMove(-1)}
				/>
				<IconButton
					icon={ArrowDown}
					aria-label={`Move ${preset.name} down`}
					disabled={pending || last}
					onClick={() => onMove(1)}
				/>
				<IconButton
					icon={Pencil}
					aria-label={`Edit ${preset.name}`}
					disabled={pending}
					onClick={onEdit}
				/>
				<IconButton
					icon={Trash2}
					aria-label={`Delete ${preset.name}`}
					disabled={pending}
					onClick={onRemove}
				/>
			</SettingControl>
		</SettingItem>
	);
}
