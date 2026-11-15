import { MarkdownRenderChild } from 'obsidian';
import type { DirectiveRegistry } from '../registry.js';
import type { DirectiveReference } from '../syntax/types.js';
import { mountDirective } from '../render/mount.js';

export class DirectiveRenderChild extends MarkdownRenderChild {
	constructor(
		host: HTMLElement,
		private readonly registry: DirectiveRegistry,
		private readonly reference: DirectiveReference,
	) {
		super(host);
	}

	onload(): void {
		this.register(
			mountDirective(this.containerEl, this.registry, this.reference),
		);
	}
}
