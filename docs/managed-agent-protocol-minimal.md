# Managed Agent Protocol, Minimal Draft

Status: planning draft
Date: 2026-03-12

## Purpose

Define the smallest useful managed-agent protocol for Franklin's first implementation.

This draft is intentionally narrow.

It does not try to capture every runtime feature.
It does not try to model every vendor concept.
It only defines the minimum control and event surface needed to:

- create a managed agent process
- start, resume, or fork a runtime session through that process
- send user input
- stream normalized item events back to the app
- handle permission requests

## Core split

The protocol should distinguish two different things:

### 1. App-owned process lifecycle

The app can:

- create a new local task or tab
- spawn a managed-agent subprocess cheaply
- keep that process around even before a runtime session has started

This is app-level lifecycle.

### 2. Managed-agent-owned runtime lifecycle

The managed agent should own:

- `start`
- `resume`
- `fork`
- turn execution
- permission handling
- runtime event normalization

This means `start`, `resume`, and `fork` should stay as protocol commands.

They should not be treated as item events.

## Design choices for the minimal draft

This draft intentionally keeps several things simple.

### Keep

- commands vs events
- explicit session control commands
- explicit permission flow
- item streaming via `started`, `delta`, and `completed`

### Remove for now

- session ids
- turn ids
- item ids
- vendor metadata
- source metadata
- rich session specs

These can be added later once the basic shape is stable.

## Minimal command model

For now, `SessionSpec` and `SessionRef` can be placeholders.

```ts
type SessionSpec = {};

type SessionRef = {};
```

The minimal command set should be:

```ts
type ManagedAgentCommand =
  | {
      type: "session.start";
      spec: SessionSpec;
    }
  | {
      type: "session.resume";
      ref: SessionRef;
    }
  | {
      type: "session.fork";
      ref: SessionRef;
      spec?: Partial<SessionSpec>;
    }
  | {
      type: "turn.start";
      input: InputItem[];
    }
  | {
      type: "turn.interrupt";
    }
  | {
      type: "permission.resolve";
      decision: PermissionDecision;
    };
```

## Minimal command result model

Keep command results simple:

```ts
type ManagedAgentCommandResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };
```

## Minimal event model

The event stream should contain:

- session lifecycle events
- turn lifecycle events
- item events
- permission events
- terminal completion or error events

```ts
type ManagedAgentEvent =
  | {
      type: "agent.ready";
    }
  | {
      type: "session.started";
    }
  | {
      type: "session.resumed";
    }
  | {
      type: "session.forked";
    }
  | {
      type: "turn.started";
    }
  | ItemStartedEvent
  | ItemDeltaEvent
  | ItemCompletedEvent
  | {
      type: "permission.requested";
      payload: PermissionRequest;
    }
  | {
      type: "permission.resolved";
      payload: PermissionResolution;
    }
  | {
      type: "turn.completed";
    }
  | {
      type: "error";
      error: {
        code: string;
        message: string;
      };
    }
  | {
      type: "agent.exited";
    };
```

## Why `start`, `resume`, and `fork` are not items

`item.started`, `item.delta`, and `item.completed` should model work happening inside a turn.

That includes things like:

- a user message
- an assistant message
- later, a tool call
- later, a file change

But `start`, `resume`, and `fork` are not item-level work.
They are session control actions.

So they should remain:

- commands from app to managed agent
- lifecycle events from managed agent back to app

## Item event structure

The minimal item stream should use three envelopes:

```ts
type ItemStartedEvent = {
  type: "item.started";
  item: ItemStarted;
};

type ItemDeltaEvent = {
  type: "item.delta";
  item: ItemDelta;
};

type ItemCompletedEvent = {
  type: "item.completed";
  item: ItemCompleted;
};
```

The key design choice is:

- use discriminated unions
- use `kind` as the discriminator
- attach type-specific payload directly to each item variant

This is better than:

- a generic base item plus untyped payload bag
- a base `type` field that collides with the event envelope `type`

So:

- event envelope uses `type`
- item payload uses `kind`

## Minimal input item model

For now, input can also stay minimal:

```ts
type InputItem =
  | {
      kind: "user_message";
      text: string;
    };
```

This can later grow to include:

- images
- mentions
- skills
- structured attachments

## Minimal item kinds

For the first implementation, only support two item kinds:

- `user_message`
- `assistant_message`

Do not include tool calls, file changes, or other item kinds yet.

Those can be added later once the protocol shape is stable.

## Item discriminated unions

### Started

```ts
type ItemStarted =
  | {
      kind: "user_message";
      text: string;
    }
  | {
      kind: "assistant_message";
    };
```

### Delta

```ts
type ItemDelta =
  | {
      kind: "user_message";
      textDelta: string;
    }
  | {
      kind: "assistant_message";
      textDelta: string;
    };
```

### Completed

```ts
type ItemCompleted =
  | {
      kind: "user_message";
      text: string;
    }
  | {
      kind: "assistant_message";
      text: string;
    };
```

## Why this shape is useful

This shape is intentionally boring.

That is good for the first implementation.

It gives Franklin:

- one generic event pipeline for items
- strong typing via discriminated unions
- no early commitment to ids or vendor metadata
- a clear path to add more item kinds later

It also maps reasonably well to current vendor behavior:

- Claude can emit user and assistant message items directly
- Codex can map richer internal events down to this minimal shape first

## Permission model

Keep permission flow explicit and separate from items.

```ts
type PermissionRequest = {
  kind: "generic";
  message: string;
};

type PermissionDecision = "allow" | "deny";

type PermissionResolution = {
  decision: PermissionDecision;
};
```

This can later expand into more specific kinds like:

- command execution approval
- file change approval
- tool input request

But the minimal protocol does not need that yet.

## Example event flow

A minimal assistant turn could look like:

```ts
{ type: "turn.started" }
{ type: "item.started", item: { kind: "user_message", text: "Explain this file." } }
{ type: "item.completed", item: { kind: "user_message", text: "Explain this file." } }
{ type: "item.started", item: { kind: "assistant_message" } }
{ type: "item.delta", item: { kind: "assistant_message", textDelta: "This file defines " } }
{ type: "item.delta", item: { kind: "assistant_message", textDelta: "the runtime adapter." } }
{ type: "item.completed", item: { kind: "assistant_message", text: "This file defines the runtime adapter." } }
{ type: "turn.completed" }
```

A turn with an approval pause could look like:

```ts
{ type: "turn.started" }
{ type: "permission.requested", payload: { kind: "generic", message: "Allow command execution?" } }
```

then the app sends:

```ts
{ type: "permission.resolve", decision: "allow" }
```

then the stream continues.

## What this draft intentionally leaves open

This draft does not commit:

- how `SessionSpec` should look
- how `SessionRef` should look
- whether ids should exist in the next iteration
- what richer item kinds should be added next
- whether raw output should also be preserved in the protocol

Those should be decided after the first minimal integration works.

## Recommended next step

Implement the protocol with exactly this small surface first.

Then, in a second pass:

1. add ids if the app actually needs them
2. add `tool_call`
3. add `file_change`
4. add richer permission request variants

That sequencing is preferable to over-designing the first schema.
