import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	EXT_ICONS,
	FILENAME_ICONS,
	FileIcon,
} from '../../src/components/file-icon.js';

function IconGrid() {
	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
			{Object.entries(FILENAME_ICONS).map(([name]) => (
				<div
					key={`file:${name}`}
					className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm"
				>
					<FileIcon filename={name} className="h-4 w-4" withBrandColor />
					<span className="truncate font-mono text-xs">{name}</span>
				</div>
			))}
			{Object.entries(EXT_ICONS).map(([ext]) => (
				<div
					key={`ext:${ext}`}
					className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm"
				>
					<FileIcon
						filename={`file.${ext}`}
						className="h-4 w-4"
						withBrandColor
					/>
					<span className="truncate font-mono text-xs">.{ext}</span>
				</div>
			))}
			<div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm">
				<FileIcon filename="unknown" className="h-4 w-4" />
				<span className="truncate font-mono text-xs text-muted-foreground">
					(fallback)
				</span>
			</div>
		</div>
	);
}

const meta = {
	title: 'Components/FileIcon',
	component: IconGrid,
} satisfies Meta<typeof IconGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllIcons: Story = {};
