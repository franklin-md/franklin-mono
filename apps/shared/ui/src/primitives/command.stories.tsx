import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from './command.js';

function CommandPalette() {
	return (
		<div className="w-80">
			<Command>
				<CommandInput placeholder="Search actions..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Navigation">
						<CommandItem>Go to conversations</CommandItem>
						<CommandItem>Open sessions</CommandItem>
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading="Actions">
						<CommandItem>Build Storybook</CommandItem>
						<CommandItem>Run tests</CommandItem>
						<CommandItem>Open settings</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
		</div>
	);
}

const meta = {
	title: 'Primitives/Command',
	component: CommandPalette,
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
