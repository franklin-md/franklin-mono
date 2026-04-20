1. Pure registry/resolution vs TUI-coupled

The reusable part of Pi is small but real. Registration itself is mostly pure accumulation in [loader.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/loader.ts:161): `registerCommand`, `registerFlag`, and `registerShortcut` just write into per-extension maps, and flag defaults land in shared runtime state. Resolution is also mostly pure in [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:374) and [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:474): flags are merged, duplicate command names are suffix-resolved, and shortcut conflicts are resolved against a host keymap. Built-in slash metadata is just data in [slash-commands.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/slash-commands.ts:17), and CLI flag application is standalone in [agent-session-services.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/agent-session-services.ts:76).

The non-reusable part is the bulk of the surface. [keybindings.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/keybindings.ts:1) subclasses `@mariozechner/pi-tui` types directly. [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:109) exposes `ExtensionUIContext` with selectors, overlays, widgets, header/footer/editor replacement, theme access, and raw terminal input; `RegisteredCommand` also carries UI-facing arg completion hooks at [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:983). Command execution is wired into session prompting/streaming in [agent-session.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/agent-session.ts:938) and [agent-session.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/agent-session.ts:1089). The examples are mostly UI-first, e.g. [plan-mode/index.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/plan-mode/index.ts:43) and [preset.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/preset.ts:225).

2. Interfaces a reusable core would need

A Franklin core should separate registry from host UI the way Franklin already separates registration from runtime binding in [registrar/create.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/core/compile/registrar/create.ts:13), [registrar/types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/core/compile/registrar/types.ts:30), and [registrar/bind.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/core/compile/registrar/bind.ts:18).

The reusable core needs:
- A single command catalog abstraction for built-ins, extensions, and any future prompt/template commands. Pi is fragmented: built-ins are static in [slash-commands.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/slash-commands.ts:17), while extension/prompt/skill commands are assembled separately in [agent-session.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/agent-session.ts:2124).
- Host-neutral `CommandSpec`, `FlagSpec`, and `ShortcutSpec`.
- A collision policy for duplicate command names and shortcuts.
- A runtime `CommandContext` that is just Franklin runtime slices, not a monolithic Pi session/UI object.
- A host adapter for keybinding normalization/reserved chords and optional UI adapters for palette/completions/help.

3. Reuse vs clean rebuild

Reuse the ideas, not the code.

Franklin already has the cleaner architecture for this: pure extension factories in [extension.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/algebra/types/extension.ts:4), explicit compile/build separation in [compiler.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/core/compile/compiler.ts:29), and system composition in [combine.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/algebra/compiler/combine.ts:12) and [builder.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/algebra/system/builder.ts:8).

Pi’s command subsystem is also a bit ad hoc. `ResourceLoader` says it detects command conflicts at [resource-loader.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/resource-loader.ts:403), but the implementation only tracks tools and flags at [resource-loader.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/resource-loader.ts:879). That is a sign the current Pi code is not a clean reusable core yet. A Franklin rebuild should be small and cleaner than adaptation.

4. Minimal Franklin `CommandAPI` shape

```ts
interface CommandAPI<Runtime> {
  registerCommand(spec: {
    name: string;
    description?: string;
    completeArgs?(prefix: string, ctx: Runtime): MaybePromise<readonly { value: string; label?: string }[] | null>;
    execute(args: string, ctx: Runtime): MaybePromise<void>;
  }): void;

  registerFlag(spec: {
    name: string;
    description?: string;
    kind: "boolean" | "string";
    default?: boolean | string;
  }): void;

  registerShortcut(spec: {
    chord: string;
    description?: string;
    execute(ctx: Runtime): MaybePromise<void>;
  }): void;
}

interface CommandRuntime {
  getFlag(name: string): boolean | string | undefined;
  listCommands(): readonly CommandDescriptor[];
  resolveCommand(name: string): CommandDescriptor | undefined;
}
```

That fits Franklin’s existing registrar/compiler pattern well: add a separate `CommandSystem`, keep registration data-only, and let the app layer own slash parsing, UI, and actual keybinding dispatch.

