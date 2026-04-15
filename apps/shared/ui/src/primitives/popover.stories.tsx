import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button.js';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';

function PopoverDemo() {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Open popover</Button>
			</PopoverTrigger>
			<PopoverContent className="space-y-2 p-4">
				<div className="space-y-1">
					<p className="text-sm font-medium">Repository actions</p>
					<p className="text-sm text-muted-foreground">
						Preview shared UI components in isolation before wiring them into
						the app shell.
					</p>
				</div>
				<Button size="sm">Launch Storybook</Button>
			</PopoverContent>
		</Popover>
	);
}

const meta = {
	title: 'Primitives/Popover',
	component: PopoverDemo,
} satisfies Meta<typeof PopoverDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
