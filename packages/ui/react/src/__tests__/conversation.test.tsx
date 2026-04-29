import { describe, it, expect, expectTypeOf, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type {
	ConversationTurn,
	TextBlock,
	ThinkingBlock,
	ToolSpec,
	ToolUseBlock,
} from '@franklin/extensions';
import { StopCode } from '@franklin/mini-acp';

import { Conversation } from '../conversation/conversation.js';
import type { ConversationRenderTurn } from '../conversation/turn-info/types.js';
import { computeToolStatus } from '../conversation/tools/status.js';
import {
	createToolRenderer,
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

const readFileSpec = {
	name: 'read_file',
	description: 'Read file',
	schema: undefined as never,
} as ToolSpec<
	'read_file',
	{
		path: string;
		limit: number;
		offset?: number | undefined;
	}
>;

// ---------------------------------------------------------------------------
// computeToolStatus
// ---------------------------------------------------------------------------

describe('computeToolStatus', () => {
	const base: ToolUseBlock = {
		kind: 'toolUse',
		call: { type: 'toolCall', id: '1', name: 'read', arguments: {} },
		startedAt: 0,
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
		const reg = createToolRendererRegistry([['read', readRenderer]]);
		expect(resolveToolRenderer(reg, 'read')).toBe(readRenderer);
	});

	it('accepts bindings created from tool specs', () => {
		const reg = createToolRendererRegistry([
			createToolRenderer(readFileSpec, readRenderer),
		]);
		expect(resolveToolRenderer(reg, 'read_file')).toBe(readRenderer);
	});

	it('falls back to * when no exact match', () => {
		const reg = createToolRendererRegistry([['*', fallback]]);
		expect(resolveToolRenderer(reg, 'unknown')).toBe(fallback);
	});

	it('uses built-in fallback when no * entry', () => {
		const reg = createToolRendererRegistry([]);
		const entry = resolveToolRenderer(reg, 'unknown');
		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: { type: 'toolCall', id: '1', name: 'grep', arguments: {} },
			startedAt: 0,
		};
		expect(
			entry.summary({ block, status: 'success', args: block.call.arguments }),
		).toBe('grep');
	});

	it('prefers exact match over *', () => {
		const reg = createToolRendererRegistry([
			['read', readRenderer],
			['*', fallback],
		]);
		expect(resolveToolRenderer(reg, 'read')).toBe(readRenderer);
	});

	it('uses the latest renderer when tool names are registered more than once', () => {
		const replacementRenderer: ToolRendererEntry = {
			summary: ({ block }) => `replacement: ${block.call.name}`,
		};
		const reg = createToolRendererRegistry([
			['read', readRenderer],
			['read', replacementRenderer],
		]);

		expect(resolveToolRenderer(reg, 'read')).toBe(replacementRenderer);
	});
});

describe('createToolRenderer', () => {
	it('infers renderer args from the tool spec', () => {
		const renderer = createToolRenderer(readFileSpec, {
			summary: ({ args }) => args.path,
		});

		expectTypeOf(renderer[0]).toEqualTypeOf<'read_file'>();
		expectTypeOf(renderer[1]).toEqualTypeOf<
			ToolRendererEntry<{
				path: string;
				limit: number;
				offset?: number | undefined;
			}>
		>();
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
		const userTurns: ConversationRenderTurn[] = [];

		const components: ConversationComponents = {
			Text: ({ block }: { block: TextBlock }) => {
				texts.push(block.text);
				return null;
			},
			Thinking: ({ block }: { block: ThinkingBlock }) => {
				thinkings.push(block.text);
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
			UserMessage: ({ turn }: { turn: ConversationRenderTurn }) => {
				userTurns.push(turn);
				const text = turn.prompt.content
					.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
					.map((c) => c.text)
					.join('');
				users.push(text);
				return null;
			},
		};

		return { components, texts, thinkings, tools, users, userTurns };
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
					{ kind: 'text', text: 'hi there', startedAt: 0 },
					{
						kind: 'toolUse',
						call: {
							type: 'toolCall',
							id: 'c1',
							name: 'read',
							arguments: {},
						},
						result: [{ type: 'text', text: 'file contents' }],
						startedAt: 0,
					},
					{ kind: 'thinking', text: 'hmm', startedAt: 0 },
				],
			},
		},
	];

	it('dispatches user messages', () => {
		const { components, users, userTurns } = createCapturingComponents();
		render(<Conversation turns={turns} components={components} />);
		expect(users).toEqual(['hello']);
		expect(userTurns[0]?.phase).toBe('in-progress');
	});

	it('renders the empty placeholder when there are no turns', () => {
		const { components } = createCapturingComponents();
		render(
			<Conversation
				turns={[]}
				components={{
					...components,
					EmptyPlaceholder: () => <div data-testid="empty">Empty</div>,
				}}
			/>,
		);

		expect(screen.getByTestId('empty')).toBeTruthy();
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
							startedAt: 0,
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
							startedAt: 0,
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
					Turn: ({ children, turn }) => {
						wrapperCalled(turn.phase);
						return <>{children}</>;
					},
				}}
			/>,
		);
		expect(wrapperCalled).toHaveBeenCalledTimes(1);
		expect(wrapperCalled).toHaveBeenCalledWith('in-progress');
	});

	it('uses custom AssistantMessage wrapper when provided', () => {
		const wrapperCalled = vi.fn();
		const { components } = createCapturingComponents();
		render(
			<Conversation
				turns={turns}
				components={{
					...components,
					AssistantMessage: ({ children, turn }) => {
						wrapperCalled(turn.id);
						return <>{children}</>;
					},
				}}
			/>,
		);
		expect(wrapperCalled).toHaveBeenCalledTimes(1);
		expect(wrapperCalled).toHaveBeenCalledWith('t1');
	});

	it('uses custom Waiting when provided', () => {
		const waitingCalled = vi.fn();
		const { components } = createCapturingComponents();
		render(
			<Conversation
				turns={turns}
				now={2_000}
				components={{
					...components,
					Waiting: ({ turn }) => {
						waitingCalled({
							id: turn.id,
							elapsedMs: turn.timing.elapsedMs,
							isLast: turn.isLast,
							phase: turn.phase,
						});
						return null;
					},
				}}
			/>,
		);
		expect(waitingCalled).toHaveBeenCalledWith({
			id: 't1',
			elapsedMs: 2_000,
			isLast: true,
			phase: 'in-progress',
		});
	});

	it('uses custom Footer when provided for complete turns', () => {
		const footerCalled = vi.fn();
		const { components } = createCapturingComponents();
		const completeTurns: ConversationTurn[] = [
			{
				id: 't4',
				timestamp: 0,
				prompt: {
					role: 'user',
					content: [{ type: 'text', text: 'done' }],
				},
				response: {
					blocks: [
						{ kind: 'text', text: 'finished', startedAt: 0 },
						{
							kind: 'turnEnd',
							stopCode: StopCode.Finished,
							startedAt: 2_000,
							endedAt: 2_000,
						},
					],
				},
			},
		];
		render(
			<Conversation
				turns={completeTurns}
				now={3_000}
				components={{
					...components,
					Footer: ({ turn }) => {
						footerCalled({
							id: turn.id,
							elapsedMs: turn.timing.elapsedMs,
							isLast: turn.isLast,
							phase: turn.phase,
						});
						return null;
					},
				}}
			/>,
		);
		expect(footerCalled).toHaveBeenCalledWith({
			id: 't4',
			elapsedMs: 2_000,
			isLast: true,
			phase: 'complete',
		});
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
				response: { blocks: [{ kind: 'text', text: 'reply 1', startedAt: 0 }] },
			},
			{
				id: 'b',
				timestamp: 1,
				prompt: {
					role: 'user',
					content: [{ type: 'text', text: 'second' }],
				},
				response: { blocks: [{ kind: 'text', text: 'reply 2', startedAt: 0 }] },
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

		const registry = createToolRendererRegistry([
			[
				'read',
				{
					summary: ({ block }) => `summary:${block.call.name}`,
					expanded: ({ block }) => `expanded:${block.call.name}`,
				},
			],
		]);

		function Chrome(props: ResolvedToolRender) {
			captured.push(props);
			return null;
		}

		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: { type: 'toolCall', id: '1', name: 'read', arguments: {} },
			result: [{ type: 'text', text: 'ok' }],
			startedAt: 0,
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

		const registry = createToolRendererRegistry([
			[
				'*',
				{
					summary: ({ block }) => `fallback:${block.call.name}`,
				},
			],
		]);

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
			startedAt: 0,
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

		const registry = createToolRendererRegistry([
			['read', { summary: () => 'summary' }],
		]);

		function Chrome(props: ResolvedToolRender) {
			captured.push(props);
			return null;
		}

		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: { type: 'toolCall', id: '1', name: 'read', arguments: {} },
			startedAt: 0,
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

		const registry = createToolRendererRegistry([
			[
				'read',
				{
					summary: ({ block }) => `summary:${block.call.name}`,
				},
			],
		]);

		function Chrome(props: ResolvedToolRender) {
			captured.push(props);
			return null;
		}

		const ToolUse = createToolUseBlock(registry, Chrome);

		const block: ToolUseBlock = {
			kind: 'toolUse',
			call: { type: 'toolCall', id: '1', name: 'read', arguments: {} },
			result: [{ type: 'text', text: 'ok' }],
			startedAt: 0,
		};

		render(<ToolUse block={block} status="success" />);

		expect(captured).toHaveLength(1);
		const props = captured[0] as ResolvedToolRender;
		expect(props.summary).toBe('summary:read');
		expect(props.status).toBe('success');
	});
});
