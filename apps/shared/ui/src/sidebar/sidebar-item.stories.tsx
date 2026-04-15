import type { Meta, StoryObj } from '@storybook/react-vite';

import { SidebarItem } from './sidebar-item.js';

const meta = {
	title: 'Sidebar/SidebarItem',
	component: SidebarItem,
	args: {
		name: 'Storybook setup',
		status: 'idle',
		active: false,
		onClick: () => {},
	},
	argTypes: {
		status: {
			control: 'select',
			options: ['idle', 'unread', 'in-progress'],
		},
	},
} satisfies Meta<typeof SidebarItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Active: Story = {
	args: {
		active: true,
		status: 'in-progress',
	},
};

export const WithDelete: Story = {
	args: {
		status: 'unread',
		onDelete: () => {},
	},
};

export const Gallery: Story = {
	render: () => (
		<div className="w-64 space-y-2 rounded-2xl bg-muted/40 p-2">
			<SidebarItem
				name="Active conversation"
				status="in-progress"
				active={true}
				onClick={() => {}}
			/>
			<SidebarItem
				name="Unread update"
				status="unread"
				active={false}
				onClick={() => {}}
			/>
			<SidebarItem
				name="Idle agent"
				status="idle"
				active={false}
				onClick={() => {}}
				onDelete={() => {}}
			/>
		</div>
	),
};
