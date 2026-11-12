import { useSyncExternalStore } from 'react';
import type { DirectiveRegistry } from '../registry.js';
import { formatDirective } from '../syntax/format.js';
import type { DirectiveReference } from '../syntax/types.js';
import { DirectiveBoundary } from './boundary.js';

type Props = { registry: DirectiveRegistry; reference: DirectiveReference };

export function DirectiveComponent({ registry, reference }: Props) {
	const Renderer = useSyncExternalStore(registry.subscribe, () =>
		registry.getRenderer(reference.name, reference.id),
	);
	const text = formatDirective(reference.name, reference.id);
	return Renderer ? (
		<DirectiveBoundary key={reference.id} fallback={text}>
			{/* Own line alignment here so current and future directives share the
			    same default in Live Preview and Reading mode. Keep this inside the
			    boundary so unknown or failed renderers remain ordinary inline text.
			    https://developer.mozilla.org/en-US/docs/Web/CSS/vertical-align */}
			<span className="inline-flex items-center align-middle">
				<Renderer id={reference.id} />
			</span>
		</DirectiveBoundary>
	) : (
		text
	);
}
