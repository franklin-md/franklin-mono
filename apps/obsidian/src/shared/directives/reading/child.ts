import { MarkdownRenderChild } from 'obsidian';
import type { DirectiveRegistry } from '../registry.js';
import type { DirectiveReference } from '../syntax/types.js';
import { mountDirective } from '../render/mount.js';

export class DirectiveRenderChild extends MarkdownRenderChild {
	private dispose?: () => void;

	constructor(
		host: HTMLElement,
		private readonly registry: DirectiveRegistry,
		private readonly reference: DirectiveReference,
	) {
		super(host);
	}

	onload(): void {
		this.dispose = mountDirective(
			this.containerEl,
			this.registry,
			this.reference,
		);
	}

	onunload(): void {
		this.dispose?.();
		this.dispose = undefined;
	}
}
