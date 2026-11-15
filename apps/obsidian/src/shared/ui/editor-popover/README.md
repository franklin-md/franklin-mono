# Editor popovers

Obsidian geometry and lifecycle helpers for editor-launched React content.
Plugin startup registers the shared editor anchor field. It tracks the invocation
caret through edits independently of later cursor movement.

`mountEditorPopover({ app, editor, info, validate, onClose, render })` returns a
session with `anchor`, `contentRef`, `focus()` and `close(restoreFocus)`.
`validate` checks caller-owned capture validity. Host events recheck it and close
the session when the editor disconnects, changes file, migrates windows, or the
window closes. Callers must also close their sessions on plugin unload.
Closing releases host listeners and anchor state; React unmount is deferred to a
microtask so dismissal during a React commit is safe.

Compose main's existing `@franklin/ui` popover parts inside `render`:

```tsx
render: (session) => (
	<Popover open onOpenChange={(open) => !open && session.close(false)}>
		<PopoverAnchor virtualRef={{ current: session.anchor }} />
		<PopoverContent
			ref={session.contentRef}
			aria-label="Editor tools"
			side="top"
			align="center"
			sideOffset={6}
			collisionPadding={8}
			className="w-max max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-auto p-1"
			onEscapeKeyDown={(event) => {
				event.preventDefault();
				session.close(true);
			}}
			onCloseAutoFocus={(event) => event.preventDefault()}
		>
			{/* Caller-owned controls, such as PromptSurface or IconActionGroup. */}
		</PopoverContent>
	</Popover>
);
```

Use `close(true)` for Escape or an explicit action that should return focus to
the original editor. Outside dismissal uses `close(false)` to preserve focus on
the clicked control. `session.focus()` focuses the first enabled control and can
be called from `onOpenAutoFocus` after preventing its default.
Let Tab reach the controls and isolate any Obsidian-specific hotkeys at the host
boundary; shared controls retain their own keyboard behavior. No portable
popover wrapper or duplicate shared component exports are needed.

See [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover)
for focus/dismissal events and [CodeMirror position mapping](https://codemirror.net/docs/ref/#state.ChangeDesc.mapPos)
for caret tracking through editor transactions.
