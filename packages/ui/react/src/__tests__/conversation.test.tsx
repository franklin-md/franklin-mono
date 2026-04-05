import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ConversationTurn, ToolUseBlock } from '@franklin/extensions';

import { Conversation } from '../conversation/conversation.js';
import { computeToolStatus } from '../conversation/tools/status.js';
import {
	createToolRendererRegistry,
	resolveToolRenderer,
} from '../conversation/tools/registry.js';
import {
	ToolUseBlock as ToolUseBlockComponent,
	createToolUseBlock,
} from '../conversation/tools/tool-use.js';
import type { ConversationComponents } from '../conversation/types.js';
import type {
	ResolvedToolRender,
	ToolRendererEntry,
	ToolStatus,
} from '../conversation/tools/types.js';

// ---------------------------------------------------------------------------
// computeToolStatus
// ---------------------------------------------------------------------------

describe('computeToolStatus', () => {
	const base: ToolUseBlock = {
		kind: 'toolUse',
		call: { type: 'toolCall', id: '1', name: 'read', arguments: {} },
	};

	it('returns in-progress when result is undefined', () => {
		expect(computeToolStatus(base)).toBe('in-progress');
	});

	it('returns success when result is present', () => {
		const block: ToolUseBlock = {
			...base,
			result: [{ type: 'text', text: 'ok' }],
		};
		expect(computeToolStatus(block)).toBe('success');
	});

	it('returns error when isError is true', () => {
		const block: ToolUseBlock = {
			...base,
			result: [{ type: 'text', text: 'failed' }],
			isError: true,
		};
		expect(computeToolStatus(block)).toBe('error');
	});
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe('resolveToolRenderer', () => {
	const readRenderer: ToolRendererEntry = {
		summary: ({ block }) => `read: ${block.call.name}`,
	};
	const fallback: ToolRendererEntry = {
		summary: ({ block }) => `fallback: ${block.call.name}`,
	};

	it('resolves an exact match', () => {
		const reg = createToolRendererRegistry({ read: readRenderer });
		expect(resolveToolRenderer(reg, 'read')).toBe(readRenderer);
	});

	it('falls back to * when no exact match', () => {
		const reg = createToolRendererRegistry({ '*': fallback });
		expect(resolveToolRenderer(reg, 'unknown')).toBe(fallback);
	});

	it('uses built-in fallback when no * entry', () => {
		const reg = createToolRendererRegistry({});
		const entry = resolveToolRenderer(reg, 'unknown');
		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: { type: 'toolCall', id: '1', name: 'grep', arguments: {} },
		};
		expect(
			entry.summary({ block, status: 'success', args: block.call.arguments }),
		).toBe('grep');
	});

	it('prefers exact match over *', () => {
		const reg = createToolRendererRegistry({
			read: readRenderer,
			'*': fallback,
		});
		expect(resolveToolRenderer(reg, 'read')).toBe(readRenderer);
	});
});

// ---------------------------------------------------------------------------
// Conversation component
// ---------------------------------------------------------------------------

describe('Conversation', () => {
	type CapturedTool = { name: string; status: ToolStatus };

	function createCapturingComponents() {
		const texts: string[] = [];
		const thinkings: string[] = [];
		const tools: CapturedTool[] = [];
		const users: string[] = [];

		const components: ConversationComponents = {
			Text: ({ text }: { text: string }) => {
				texts.push(text);
				return null;
			},
			Thinking: ({ text }: { text: string }) => {
				thinkings.push(text);
				return null;
			},
			ToolUse: ({
				block,
				status,
			}: {
				block: ToolUseBlock;
				status: ToolStatus;
			}) => {
				tools.push({ name: block.call.name, status });
				return null;
			},
			UserMessage: ({ message }: { message: ConversationTurn['prompt'] }) => {
				const text = message.content
					.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
					.map((c) => c.text)
					.join('');
				users.push(text);
				return null;
			},
		};

		return { components, texts, thinkings, tools, users };
	}

	const turns: ConversationTurn[] = [
		{
			id: 't1',
			timestamp: 0,
			prompt: {
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			},
			response: {
				blocks: [
					{ kind: 'text', text: 'hi there' },
					{
						kind: 'toolUse',
						call: {
							type: 'toolCall',
							id: 'c1',
							name: 'read',
							arguments: {},
						},
						result: [{ type: 'text', text: 'file contents' }],
					},
					{ kind: 'thinking', text: 'hmm' },
				],
			},
		},
	];

	it('dispatches user messages', () => {
		const { components, users } = createCapturingComponents();
		render(<Conversation turns={turns} components={components} />);
		expect(users).toEqual(['hello']);
	});

	it('dispatches text blocks', () => {
		const { components, texts } = createCapturingComponents();
		render(<Conversation turns={turns} components={components} />);
		expect(texts).toEqual(['hi there']);
	});

	it('dispatches tool use blocks with computed status', () => {
		const { components, tools } = createCapturingComponents();
		render(<Conversation turns={turns} components={components} />);
		expect(tools).toEqual([{ name: 'read', status: 'success' }]);
	});

	it('dispatches thinking blocks', () => {
		const { components, thinkings } = createCapturingComponents();
		render(<Conversation turns={turns} components={components} />);
		expect(thinkings).toEqual(['hmm']);
	});

	it('renders in-progress status for pending tools', () => {
		const pendingTurns: ConversationTurn[] = [
			{
				id: 't2',
				timestamp: 0,
				prompt: {
					role: 'user',
					content: [{ type: 'text', text: 'go' }],
				},
				response: {
					blocks: [
						{
							kind: 'toolUse',
							call: {
								type: 'toolCall',
								id: 'c2',
								name: 'write',
								arguments: {},
							},
						},
					],
				},
			},
		];
		const { components, tools } = createCapturingComponents();
		render(<Conversation turns={pendingTurns} components={components} />);
		expect(tools).toEqual([{ name: 'write', status: 'in-progress' }]);
	});

	it('renders error status for failed tools', () => {
		const errorTurns: ConversationTurn[] = [
			{
				id: 't3',
				timestamp: 0,
				prompt: {
					role: 'user',
					content: [{ type: 'text', text: 'go' }],
				},
				response: {
					blocks: [
						{
							kind: 'toolUse',
							call: {
								type: 'toolCall',
								id: 'c3',
								name: 'write',
								arguments: {},
							},
							result: [{ type: 'text', text: 'fail' }],
							isError: true,
						},
					],
				},
			},
		];
		const { components, tools } = createCapturingComponents();
		render(<Conversation turns={errorTurns} components={components} />);
		expect(tools).toEqual([{ name: 'write', status: 'error' }]);
	});

	it('uses custom Turn wrapper when provided', () => {
		const wrapperCalled = vi.fn();
		const { components } = createCapturingComponents();
		render(
			<Conversation
				turns={turns}
				components={{
					...components,
					Turn: ({ children }) => {
						wrapperCalled();
						return <>{children}</>;
					},
				}}
			/>,
		);
		expect(wrapperCalled).toHaveBeenCalledTimes(1);
	});

	it('uses custom AssistantMessage wrapper when provided', () => {
		const wrapperCalled = vi.fn();
		const { components } = createCapturingComponents();
		render(
			<Conversation
				turns={turns}
				components={{
					...components,
					AssistantMessage: ({ children }) => {
						wrapperCalled();
						return <>{children}</>;
					},
				}}
			/>,
		);
		expect(wrapperCalled).toHaveBeenCalledTimes(1);
	});

	it('renders multiple turns', () => {
		const multiTurns: ConversationTurn[] = [
			{
				id: 'a',
				timestamp: 0,
				prompt: {
					role: 'user',
					content: [{ type: 'text', text: 'first' }],
				},
				response: { blocks: [{ kind: 'text', text: 'reply 1' }] },
			},
			{
				id: 'b',
				timestamp: 1,
				prompt: {
					role: 'user',
					content: [{ type: 'text', text: 'second' }],
				},
				response: { blocks: [{ kind: 'text', text: 'reply 2' }] },
			},
		];
		const { components, users, texts } = createCapturingComponents();
		render(<Conversation turns={multiTurns} components={components} />);
		expect(users).toEqual(['first', 'second']);
		expect(texts).toEqual(['reply 1', 'reply 2']);
	});
});

// ---------------------------------------------------------------------------
// ToolUseBlock component
// ---------------------------------------------------------------------------

describe('ToolUseBlock', () => {
	it('resolves renderer and passes to Chrome', () => {
		const captured: ResolvedToolRender[] = [];

		const registry = createToolRendererRegistry({
			read: {
				summary: ({ block }) => `summary:${block.call.name}`,
				expanded: ({ block }) => `expanded:${block.call.name}`,
			},
		});

		function Chrome(props: ResolvedToolRender) {
			captured.push(props);
			return null;
		}

		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: { type: 'toolCall', id: '1', name: 'read', arguments: {} },
			result: [{ type: 'text', text: 'ok' }],
		};

		render(
			<ToolUseBlockComponent
				block={block}
				status="success"
				registry={registry}
				Chrome={Chrome}
			/>,
		);

		expect(captured).toHaveLength(1);
		const props = captured[0] as ResolvedToolRender;
		expect(props.summary).toBe('summary:read');
		expect(props.expanded).toBe('expanded:read');
		expect(props.status).toBe('success');
		expect(props.block).toBe(block);
	});

	it('falls back to * renderer for unknown tools', () => {
		const captured: ResolvedToolRender[] = [];

		const registry = createToolRendererRegistry({
			'*': {
				summary: ({ block }) => `fallback:${block.call.name}`,
			},
		});

		function Chrome(props: ResolvedToolRender) {
			captured.push(props);
			return null;
		}

		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: '1',
				name: 'unknown_tool',
				arguments: {},
			},
		};

		render(
			<ToolUseBlockComponent
				block={block}
				status="in-progress"
				registry={registry}
				Chrome={Chrome}
			/>,
		);

		expect(captured).toHaveLength(1);
		const props = captured[0] as ResolvedToolRender;
		expect(props.summary).toBe('fallback:unknown_tool');
		expect(props.expanded).toBeUndefined();
	});

	it('passes undefined expanded when renderer has no expanded', () => {
		const captured: ResolvedToolRender[] = [];

		const registry = createToolRendererRegistry({
			read: { summary: () => 'summary' },
		});

		function Chrome(props: ResolvedToolRender) {
			captured.push(props);
			return null;
		}

		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: { type: 'toolCall', id: '1', name: 'read', arguments: {} },
		};

		render(
			<ToolUseBlockComponent
				block={block}
				status="in-progress"
				registry={registry}
				Chrome={Chrome}
			/>,
		);

		const props = captured[0] as ResolvedToolRender;
		expect(props.expanded).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// createToolUseBlock factory
// ---------------------------------------------------------------------------

describe('createToolUseBlock', () => {
	it('returns a component that resolves registry and passes to Chrome', () => {
		const captured: ResolvedToolRender[] = [];

		const registry = createToolRendererRegistry({
			read: {
				summary: ({ block }) => `summary:${block.call.name}`,
			},
		});

		function Chrome(props: ResolvedToolRender) {
			captured.push(props);
			return null;
		}

		const ToolUse = createToolUseBlock(registry, Chrome);

		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: { type: 'toolCall', id: '1', name: 'read', arguments: {} },
			result: [{ type: 'text', text: 'ok' }],
		};

		render(<ToolUse block={block} status="success" />);

		expect(captured).toHaveLength(1);
		const props = captured[0] as ResolvedToolRender;
		expect(props.summary).toBe('summary:read');
		expect(props.status).toBe('success');
	});
});
