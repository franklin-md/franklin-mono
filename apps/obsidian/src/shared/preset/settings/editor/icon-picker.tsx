import { useState } from 'react';
import { IconGrid } from '@franklin/ui';
import { ObsidianIcon } from '../../../ui/icon/index.js';
import { listObsidianIcons } from '../../../ui/icon/catalog.js';

type Props = {
	value: string;
	tint: string;
	onChange: (id: string) => void;
};

// Plugins can register icons at any time, so the list is read when the popover
// content mounts, which happens each time the picker opens. Holding it here
// rather than deriving it from the open state keeps it through the popover's
// close animation, so the grid does not flash "No icons found" while it fades.
export function IconPicker({ value, tint, onChange }: Props) {
	const [icons] = useState(listObsidianIcons);
	return (
		<IconGrid
			icons={icons}
			value={value}
			renderIcon={ObsidianIcon}
			className={tint}
			onChange={onChange}
		/>
	);
}
