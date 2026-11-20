import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '@franklin/ui';
import { ObsidianIcon } from '../../ui/icon/index.js';
import { SettingControl } from '../../ui/setting/control.js';
import { SettingInfo } from '../../ui/setting/info.js';
import { SettingItem } from '../../ui/setting/item.js';
import { SettingName } from '../../ui/setting/name.js';
import { presetColors } from '../colors.js';
import type { PromptPreset } from '../types.js';

type Props = {
	preset: PromptPreset;
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
