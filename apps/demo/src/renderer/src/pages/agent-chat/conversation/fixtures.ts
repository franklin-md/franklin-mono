import type { ConversationTurn, AssistantTurn } from '@franklin/extensions';
import type { UserMessage } from '@franklin/mini-acp';
import { StopCode } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Individual prompts and responses
// ---------------------------------------------------------------------------

export const userTextPrompt: UserMessage = {
	role: 'user',
	content: [{ type: 'text', text: 'Hello, can you help me with something?' }],
};

export const assistantTextResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'text',
			text: "Of course! I'd be happy to help. What do you need?",
		},
	],
};

export const assistantThinkingResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'thinking',
			text: 'The user is asking for help. Let me consider what they might need...',
		},
		{ kind: 'text', text: 'Sure, what can I help you with?' },
	],
};

export const assistantToolCallResponse: AssistantTurn = {
	blocks: [
		{ kind: 'text', text: 'Let me look that up for you.' },
		{
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tc_001',
				name: 'file_search',
				arguments: { query: 'readme' },
			},
			result: [{ type: 'text', text: 'Found: README.md' }],
		},
		{ kind: 'text', text: 'I found the file you were looking for.' },
	],
};

export const assistantMultiBlockResponse: AssistantTurn = {
	blocks: [
		{ kind: 'thinking', text: 'Analyzing the request...' },
		{
			kind: 'text',
			text: 'Here is the first part of my answer. And here is the continuation.',
		},
		{
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tc_002',
				name: 'run_tests',
				arguments: { suite: 'unit' },
			},
		},
		{ kind: 'thinking', text: 'Tests passed. Summarizing results...' },
		{ kind: 'text', text: 'All 42 tests passed.' },
	],
};

// ---------------------------------------------------------------------------
// Markdown-rich responses
// ---------------------------------------------------------------------------

export const assistantMarkdownResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'text',
			text: `I've reviewed the codebase and here's what I found.

## Architecture Overview

The system follows a **layered architecture** with three main tiers:

1. **Transport layer** — handles raw communication
   - JSON-RPC over stdio, HTTP, or in-memory streams
   - Bidirectional message passing with backpressure
   - Automatic reconnection with exponential backoff
2. **Protocol layer** — defines the session lifecycle
   - Initialize → set context → prompt (streaming) → cancel
   - *Reverse RPC* for tool execution: the agent calls back to the client
3. **Application layer** — orchestrates sessions and extensions
   - Extension middleware (Koa-style composition)
   - File-based persistence with fork/child/restore

> The key insight is that tool execution flows **backwards** — the agent doesn't own tools, the client does. This means the host application controls the security boundary.

### Extension System

Extensions can hook into any lifecycle event. Here's how they compose:

| Hook | Direction | Pattern | Use Case |
|------|-----------|---------|----------|
| \`prompt\` | Client → Agent | Waterfall | Modify prompts before sending |
| \`chunk\` | Agent → Client | Observer | Stream UI updates |
| \`toolExecute\` | Agent → Client | Short-circuit | Register custom tools |
| \`setContext\` | Client → Agent | Waterfall | Inject tools/config |

The waterfall pattern means each extension can transform the params before passing to the next — similar to Express middleware but with typed returns.

### Potential Issues

- ~~The descriptor export in \`protocol/index.ts\` looks correct~~ Actually, both exports alias \`muClientDescriptor\` — the server descriptor is silently dropped
- The \`cancel()\` method doesn't guarantee the readable stream closes, which could cause \`prompt()\` to hang
- No guard against concurrent \`setContext\` + \`prompt\` calls — race condition risk

---

Want me to dig into any of these areas specifically?`,
		},
	],
};

export const assistantCodeBlockResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'text',
			text: `Here's how to implement the retry logic. The key is separating the **policy** (when to retry) from the **mechanism** (how to retry).

### The retry wrapper

\`\`\`typescript
type RetryPolicy = {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  shouldRetry: (error: unknown, attempt: number) => boolean;
};

const defaultPolicy: RetryPolicy = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30_000,
  shouldRetry: (error) => {
    if (error instanceof Response) {
      return error.status >= 500 || error.status === 429;
    }
    return error instanceof TypeError; // network errors
  },
};

async function withRetry<T>(
  fn: () => Promise<T>,
  policy: Partial<RetryPolicy> = {},
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, shouldRetry } = {
    ...defaultPolicy,
    ...policy,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }
      const jitter = Math.random() * 0.3 + 0.85; // 0.85–1.15x
      const delay = Math.min(baseDelay * 2 ** (attempt - 1) * jitter, maxDelay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
\`\`\`

### Usage

\`\`\`typescript
const user = await withRetry(() => fetchUser(id), {
  maxAttempts: 5,
  shouldRetry: (err) => !(err instanceof AuthError),
});
\`\`\`

### Testing it

You'll want to mock \`setTimeout\` so tests don't actually wait:

\`\`\`typescript
import { describe, it, expect, vi } from 'vitest';

describe('withRetry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('retries on transient errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce({ id: '1', name: 'Alice' });

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ id: '1', name: 'Alice' });
  });

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('network'));

    const promise = withRetry(fn, { maxAttempts: 2 });
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow('network');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
\`\`\`

A few things to note:

- The jitter factor (\`0.85–1.15x\`) prevents thundering herd when many clients retry simultaneously
- \`shouldRetry\` receives the attempt number so you can implement policies like "only retry auth errors once"
- The \`delay\` calculation uses \`Math.min\` to cap at \`maxDelay\` — without this, exponential backoff grows unbounded`,
		},
	],
};

export const assistantMathResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'text',
			text: `## Gradient Descent Explained

The core idea is simple: to minimize a function $f(\\mathbf{x})$, repeatedly take steps in the direction of steepest descent.

### The Update Rule

At each iteration $t$, update the parameters:

$$
\\mathbf{x}_{t+1} = \\mathbf{x}_t - \\eta \\nabla f(\\mathbf{x}_t)
$$

where $\\eta$ is the **learning rate** and $\\nabla f(\\mathbf{x}_t)$ is the gradient at the current point.

### Why It Works

For a convex function with Lipschitz-continuous gradients (constant $L$), choosing $\\eta = \\frac{1}{L}$ guarantees convergence at rate:

$$
f(\\mathbf{x}_t) - f(\\mathbf{x}^*) \\leq \\frac{L \\|\\mathbf{x}_0 - \\mathbf{x}^*\\|^2}{2t}
$$

This is an $O(1/t)$ rate — not great. In practice, we often use **momentum** to accelerate:

$$
\\begin{aligned}
\\mathbf{v}_{t+1} &= \\beta \\mathbf{v}_t + \\nabla f(\\mathbf{x}_t) \\\\
\\mathbf{x}_{t+1} &= \\mathbf{x}_t - \\eta \\mathbf{v}_{t+1}
\\end{aligned}
$$

With Nesterov momentum ($\\beta = 0.9$), the convergence rate improves to $O(1/t^2)$.

### Implementation

\`\`\`python
import numpy as np

def gradient_descent(
    f_grad,          # returns (f(x), grad_f(x))
    x0,              # initial parameters
    lr=0.01,         # learning rate
    momentum=0.9,    # momentum coefficient
    max_iter=1000,
    tol=1e-8,
):
    x = x0.copy()
    v = np.zeros_like(x)
    history = []

    for t in range(max_iter):
        loss, grad = f_grad(x)
        history.append(loss)

        if np.linalg.norm(grad) < tol:
            break

        v = momentum * v + grad
        x = x - lr * v

    return x, history
\`\`\`

### Comparing Optimizers

| Optimizer | Rate | Memory | Best For |
|-----------|------|--------|----------|
| SGD | $O(1/\\sqrt{t})$ | $O(n)$ | Convex problems |
| SGD + Momentum | $O(1/t^2)$ | $O(2n)$ | General deep learning |
| Adam | Adaptive | $O(3n)$ | Sparse gradients, NLP |
| L-BFGS | Superlinear | $O(mn)$ | Small-scale, convex |

> **Rule of thumb:** Start with Adam ($\\eta = 3 \\times 10^{-4}$), switch to SGD + momentum for fine-tuning if you need the absolute best generalization.

The loss landscape of neural networks is highly non-convex, so none of these convergence guarantees technically apply — but empirically, momentum-based methods work remarkably well.`,
		},
	],
};

export const assistantKitchenSinkResponse: AssistantTurn = {
	blocks: [
		{
			kind: 'thinking',
			text: 'The user wants to understand the full data pipeline. Let me trace through the code and explain each stage with concrete examples. I should cover the transform, validation, and persistence layers, and show how errors propagate.',
		},
		{
			kind: 'text',
			text: `## Data Pipeline Walkthrough

I traced through the entire ingestion flow. Here's how a record moves from the API boundary to the database.

### 1. Validation at the Edge

Incoming requests hit the Zod schema first. Invalid payloads are rejected with structured errors before any business logic runs:

\`\`\`typescript
const CreateEventSchema = z.object({
  type: z.enum(['click', 'view', 'purchase']),
  userId: z.string().uuid(),
  timestamp: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
  amount: z.number().positive().optional(),
});

type CreateEvent = z.infer<typeof CreateEventSchema>;
\`\`\`

> **Why Zod over manual validation?** It gives us the TypeScript type *and* the runtime check from a single source of truth. No drift between what the compiler believes and what actually gets enforced.

### 2. Transformation

Valid events are enriched before storage. The key transform is computing the \`sessionId\` from the user's recent activity window:`,
		},
		{
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tc_010',
				name: 'file_search',
				arguments: { path: 'src/pipeline/transform.ts' },
			},
			result: [{ type: 'text', text: 'Found: src/pipeline/transform.ts' }],
		},
		{
			kind: 'text',
			text: `Found the transform logic. Here's the core:

\`\`\`typescript
function enrichEvent(event: CreateEvent, ctx: PipelineContext): EnrichedEvent {
  const session = ctx.sessionStore.findOrCreate(event.userId, {
    windowMs: 30 * 60 * 1000, // 30-minute session window
  });

  return {
    ...event,
    id: crypto.randomUUID(),
    sessionId: session.id,
    receivedAt: new Date(),
    partition: computePartition(event.userId),
  };
}
\`\`\`

The partition key uses consistent hashing — specifically the [jump hash](https://arxiv.org/abs/1406.2294) algorithm, which gives us $O(1)$ computation and near-perfect balance:

$$
P(\\text{key} \\to \\text{bucket } b) = \\frac{1}{n} \\quad \\text{for all } b \\in \\{0, \\ldots, n-1\\}
$$

With $n = 64$ partitions, the standard deviation from perfect balance is approximately:

$$
\\sigma \\approx \\frac{\\sqrt{k}}{n} \\quad \\text{where } k = \\text{number of keys}
$$

### 3. Batching and Persistence

Events are buffered into batches before writing. The flush strategy uses a dual trigger — **count OR time**, whichever comes first:

\`\`\`typescript
interface BatchConfig {
  maxSize: number;    // flush after N events
  maxWaitMs: number;  // flush after T milliseconds
  maxRetries: number; // retry failed flushes
}

const PRODUCTION_CONFIG: BatchConfig = {
  maxSize: 500,
  maxWaitMs: 5_000,
  maxRetries: 3,
};
\`\`\`

### Performance Characteristics

| Stage | p50 Latency | p99 Latency | Throughput |
|-------|-------------|-------------|------------|
| Validation | 0.1ms | 0.3ms | ~200k/s |
| Transform | 0.2ms | 1.1ms | ~150k/s |
| Batch flush | 12ms | 45ms | ~50k/s |
| **End-to-end** | **15ms** | **52ms** | **~45k/s** |

### Error Handling

Errors at each stage are handled differently:

- **Validation errors** → 400 response with field-level details, event dropped
- **Transform errors** → sent to dead-letter queue with full context for replay
- **Persistence errors** → retried with exponential backoff, then dead-lettered

\`\`\`json
{
  "error": "VALIDATION_FAILED",
  "details": [
    { "path": ["amount"], "message": "Number must be greater than 0", "received": -5 },
    { "path": ["userId"], "message": "Invalid UUID", "received": "not-a-uuid" }
  ]
}
\`\`\`

### Next Steps

- [ ] Add circuit breaker around the persistence layer
- [ ] Implement partition rebalancing for scale-up events
- ~~Migrate to Kafka~~ — decided to stay with the custom batcher (simpler, sufficient throughput)
- [ ] Add OpenTelemetry tracing spans to each stage

Want me to implement the circuit breaker, or should we tackle the rebalancing first?`,
		},
	],
};

// ---------------------------------------------------------------------------
// Individual turns (for single-turn stories)
// ---------------------------------------------------------------------------

export const simpleTurn: ConversationTurn = {
	id: 'turn-1',
	timestamp: Date.now(),
	prompt: userTextPrompt,
	response: assistantTextResponse,
};

export const thinkingTurn: ConversationTurn = {
	id: 'turn-1',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'What is the meaning of life?' }],
	},
	response: assistantThinkingResponse,
};

export const toolCallTurn: ConversationTurn = {
	id: 'turn-3',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Now run the tests please.' }],
	},
	response: assistantMultiBlockResponse,
};

// ---------------------------------------------------------------------------
// Turn sequences (for multi-turn stories)
// ---------------------------------------------------------------------------

export const singleTurnSequence: ConversationTurn[] = [simpleTurn];

export const multiTurn: ConversationTurn[] = [
	{
		id: 'turn-1',
		timestamp: Date.now() - 60_000,
		prompt: userTextPrompt,
		response: assistantTextResponse,
	},
	{
		id: 'turn-2',
		timestamp: Date.now() - 30_000,
		prompt: {
			role: 'user',
			content: [{ type: 'text', text: 'Can you search for the README file?' }],
		},
		response: assistantToolCallResponse,
	},
	toolCallTurn,
];

export const thinkingTurnSequence: ConversationTurn[] = [thinkingTurn];

export const markdownConversation: ConversationTurn[] = [
	{
		id: 'turn-md-1',
		timestamp: Date.now() - 120_000,
		prompt: {
			role: 'user',
			content: [
				{
					type: 'text',
					text: 'Can you explain how the retry logic works and show me some code?',
				},
			],
		},
		response: assistantCodeBlockResponse,
	},
	{
		id: 'turn-md-2',
		timestamp: Date.now() - 60_000,
		prompt: {
			role: 'user',
			content: [
				{
					type: 'text',
					text: 'Nice. Now walk me through the data pipeline — I want to understand the full flow from API to database.',
				},
			],
		},
		response: assistantKitchenSinkResponse,
	},
	{
		id: 'turn-md-3',
		timestamp: Date.now(),
		prompt: {
			role: 'user',
			content: [
				{
					type: 'text',
					text: "Let's go with the circuit breaker. Also, can you explain the math behind the consistent hashing?",
				},
			],
		},
		response: assistantMathResponse,
	},
];

export const emptyConversation: ConversationTurn[] = [];

// ---------------------------------------------------------------------------
// TurnEnd turns
// ---------------------------------------------------------------------------

export const finishedTurn: ConversationTurn = {
	id: 'turn-finished',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Can you summarize that for me?' }],
	},
	response: {
		blocks: [
			{ kind: 'text', text: 'Here you go — all done!' },
			{ kind: 'turnEnd', stopCode: StopCode.Finished },
		],
	},
};

export const cancelledTurn: ConversationTurn = {
	id: 'turn-cancelled',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Explain the architecture in detail.' }],
	},
	response: {
		blocks: [
			{ kind: 'text', text: 'Sure, let me start by—' },
			{ kind: 'turnEnd', stopCode: StopCode.Cancelled },
		],
	},
};

export const maxTokensTurn: ConversationTurn = {
	id: 'turn-max-tokens',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Describe the full system architecture.' }],
	},
	response: {
		blocks: [
			{
				kind: 'text',
				text: 'The architecture of the system is divided into several layers. First, the transport layer handles raw communication over multiple protocols including stdio, HTTP, and in-memory streams. Second, the protocol layer defines the session lifecycle with initialize, set context, prompt, and cancel operations. Third, the application layer orchestrates sessions and extensions through middleware composition. Each layer has its own error handling strategy and',
			},
			{ kind: 'turnEnd', stopCode: StopCode.MaxTokens },
		],
	},
};

export const configErrorTurn: ConversationTurn = {
	id: 'turn-config-error',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'What is the meaning of life?' }],
	},
	response: {
		blocks: [
			{
				kind: 'turnEnd',
				stopCode: StopCode.ProviderNotSpecified,
				stopMessage:
					'No provider specified in config — set ctx.config.provider',
			},
		],
	},
};

export const providerErrorTurn: ConversationTurn = {
	id: 'turn-provider-error',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Tell me a joke.' }],
	},
	response: {
		blocks: [
			{
				kind: 'turnEnd',
				stopCode: StopCode.ProviderError,
				stopMessage:
					'Anthropic API returned 529: API is temporarily overloaded',
			},
		],
	},
};

export const genericErrorTurn: ConversationTurn = {
	id: 'turn-generic-error',
	timestamp: Date.now(),
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Help me with this code.' }],
	},
	response: {
		blocks: [
			{
				kind: 'turnEnd',
				stopCode: StopCode.LlmError,
			},
		],
	},
};
