import type { Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import type { DirectiveRegistry } from '../registry.js';
import { parseDirectives } from '../syntax/parse.js';
import { DirectiveWidget } from './widget.js';
import { directiveAnchors } from '../scribe/anchors.js';

export function createDirectiveExtension(
	registry: DirectiveRegistry,
): Extension {
	function build(view: EditorView): DecorationSet {
		if (!view.state.field(editorLivePreviewField, false))
			return Decoration.none;
		return Decoration.set(
			parseDirectives(view.state.doc.toString()).map((token) =>
				Decoration.replace({
					widget: new DirectiveWidget(registry, token),
				}).range(token.from, token.to),
			),
		);
	}

	return [
		directiveAnchors.field,
		ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = build(view);
				}

				update(update: ViewUpdate) {
					if (
						update.docChanged ||
						update.startState.field(editorLivePreviewField, false) !==
							update.state.field(editorLivePreviewField, false)
					)
						this.decorations = build(update.view);
				}
			},
			{
				decorations: (value) => value.decorations,
				// CodeMirror's movement and deletion commands use the same source ranges
				// as replacement decorations. Source mode deliberately stays ordinary text.
				// https://codemirror.net/docs/ref/#view.EditorView^atomicRanges
				provide: (plugin) =>
					EditorView.atomicRanges.of(
						(view) => view.plugin(plugin)?.decorations ?? Decoration.none,
					),
			},
		),
	];
}
