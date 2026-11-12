import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import type { DirectiveRegistry } from '../registry.js';
import type { DirectiveReference } from '../syntax/types.js';
import { mountDirective } from '../render/mount.js';

export class DirectiveWidget extends WidgetType {
	private readonly mounts = new WeakMap<HTMLElement, () => void>();

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
		host.contentEditable = 'false';
		this.mounts.set(host, mountDirective(host, this.registry, this.reference));
		return host;
	}

	destroy(host: HTMLElement): void {
		this.mounts.get(host)?.();
		this.mounts.delete(host);
	}

	ignoreEvent(): boolean {
		return true;
	}
}
