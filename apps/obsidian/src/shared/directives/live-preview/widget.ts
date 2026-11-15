import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import type { DirectiveRegistry } from '../registry.js';
import type { DirectiveReference } from '../syntax/types.js';
import { mountDirective } from '../render/mount.js';

// CodeMirror can reuse a DOM node across equivalent widget instances.
const mounts = new WeakMap<HTMLElement, () => void>();

export class DirectiveWidget extends WidgetType {
	constructor(
		private readonly registry: DirectiveRegistry,
		private readonly reference: DirectiveReference,
	) {
		super();
	}

	eq(other: DirectiveWidget): boolean {
		return (
			this.registry === other.registry &&
			this.reference.name === other.reference.name &&
			this.reference.id === other.reference.id
		);
	}

	toDOM(view: EditorView): HTMLElement {
		const host = view.dom.ownerDocument.createElement('span');
		mounts.set(host, mountDirective(host, this.registry, this.reference));
		return host;
	}

	destroy(host: HTMLElement): void {
		mounts.get(host)?.();
		mounts.delete(host);
	}
}
