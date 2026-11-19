import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDown, icons } from 'lucide-react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import {
	Button,
	ColorSwatches,
	IconGrid,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../src/index.js';
import type { IconRenderer } from '../../src/index.js';

// The full Lucide map (~1,600 icons) approximates Obsidian's icon registry.
// Stories are not bundled into apps, so its size does not reach consumers.
const catalog = Object.keys(icons).map((id) => ({
	id,
	label: id.replace(/(?<=[a-z0-9])(?=[A-Z])/g, ' '),
}));

const LucideById: IconRenderer = ({ id, className }) => {
	if (!Object.hasOwn(icons, id)) return null;
	const Icon = icons[id as keyof typeof icons];
	return <Icon aria-hidden="true" className={className} />;
};

const colors = [
	{ id: 'red', label: 'Red', colorClassName: 'text-red-500' },
	{ id: 'orange', label: 'Orange', colorClassName: 'text-orange-500' },
	{ id: 'yellow', label: 'Yellow', colorClassName: 'text-yellow-500' },
	{ id: 'green', label: 'Green', colorClassName: 'text-green-500' },
	{ id: 'cyan', label: 'Cyan', colorClassName: 'text-cyan-500' },
	{ id: 'blue', label: 'Blue', colorClassName: 'text-blue-500' },
	{ id: 'purple', label: 'Purple', colorClassName: 'text-purple-500' },
	{ id: 'pink', label: 'Pink', colorClassName: 'text-pink-500' },
];

// Callers compose single-field pickers in their own container. Here a popover
// holds two fields; picking an icon closes it and changing color keeps it open.
function IconAndColor() {
	const [open, setOpen] = useState(false);
	const [icon, setIcon] = useState('Link');
	const [color, setColor] = useState('blue');
	const tint = colors.find((option) => option.id === color)?.colorClassName;
	return (
		<div className="flex min-h-[28rem] items-start gap-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						aria-label="Icon"
						className="gap-1 px-2"
					>
						<LucideById id={icon} className={`size-4 ${tint ?? ''}`} />
						<ChevronDown aria-hidden="true" className="size-3 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					aria-label="Icon and color"
					collisionPadding={8}
					className="flex max-h-[var(--radix-popover-content-available-height)] w-max flex-col overflow-hidden"
				>
					<IconGrid
						icons={catalog}
						value={icon}
						renderIcon={LucideById}
						className={tint}
						onChange={(id) => {
							setIcon(id);
							setOpen(false);
						}}
					/>
					<div role="separator" className="h-px bg-border" />
					<div className="p-1">
						<ColorSwatches options={colors} value={color} onChange={setColor} />
					</div>
				</PopoverContent>
			</Popover>
			<output aria-label="Selection" className="py-1.5 text-sm">
				{icon} · {color}
			</output>
		</div>
	);
}

const meta = {
	title: 'Components/IconGrid',
	component: IconAndColor,
} satisfies Meta<typeof IconAndColor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComposedWithColor: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const page = within(canvasElement.ownerDocument.body);
		const result = canvas.getByRole('status');
		await userEvent.click(canvas.getByRole('button', { name: 'Icon' }));
		// Search is the first focusable control, so Radix focuses it on open.
		const search = await page.findByRole('searchbox', { name: 'Search icons' });
		await expect(search).toHaveFocus();
		await userEvent.click(page.getByRole('radio', { name: 'Green' }));
		await expect(result).toHaveTextContent('Link · green');
		await userEvent.click(search);
		await userEvent.keyboard('flask conical');
		// ArrowDown enters the grid; arrows then move focus between icons.
		await userEvent.keyboard('{ArrowDown}{ArrowRight}');
		await expect(
			page.getByRole('gridcell', { name: 'Flask Conical Off' }),
		).toHaveFocus();
		await userEvent.keyboard('{ArrowLeft}{Enter}');
		await expect(result).toHaveTextContent('FlaskConical · green');
	},
};
