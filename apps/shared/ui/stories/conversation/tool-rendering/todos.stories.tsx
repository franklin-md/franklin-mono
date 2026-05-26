import type { Meta, StoryObj } from '@storybook/react-vite';
import { todoExtension } from '@franklin/agent';

import { ToolRenderingMatrix } from './harness.js';

const meta = {
	title: 'Conversation/Tool Rendering/Todos',
	component: ToolRenderingMatrix,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof ToolRenderingMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AddTodo: Story = {
	args: {
		title: 'add_todo',
		toolName: todoExtension.tools.addTodo.name,
		args: { text: 'Fix pending fetch_url shimmer treatment' },
		successResultText: 'Added todo.',
		errorResultText: 'Could not add todo.',
	},
};

export const CompleteTodo: Story = {
	args: {
		title: 'complete_todo',
		toolName: todoExtension.tools.completeTodo.name,
		args: { id: 'todo-1' },
		successResultText: 'Completed todo.',
		errorResultText: 'Todo not found.',
	},
};

export const ListTodos: Story = {
	args: {
		title: 'list_todos',
		toolName: todoExtension.tools.listTodos.name,
		args: {},
		successResultText: 'Returned 3 todos.',
		errorResultText: 'Could not list todos.',
	},
};
