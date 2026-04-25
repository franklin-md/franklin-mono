import {
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '../primitives/dialog.js';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '../primitives/tabs.js';

import type { AuthPanelDescriptor } from './types.js';

/**
 * Config-driven auth dialog content.
 *
 * - One panel  → rendered directly (no tabs).
 * - Two+ panels → rendered as tabs; all stay force-mounted so an in-progress
 *   OAuth flow is never lost when switching tabs.
 */
export function AuthModalContent({
	panels,
}: {
	panels: AuthPanelDescriptor[];
}) {
	return (
		<DialogContent className="w-[500px]">
			<DialogHeader>
				<DialogTitle>Authentication</DialogTitle>
			</DialogHeader>

			{panels.length === 1 && panels[0] ? (
				<SinglePanel panel={panels[0]} />
			) : (
				<TabbedPanels panels={panels} />
			)}
		</DialogContent>
	);
}

// ---------------------------------------------------------------------------

function SinglePanel({ panel }: { panel: AuthPanelDescriptor }) {
	const Component = panel.component;
	return <Component />;
}

function TabbedPanels({ panels }: { panels: AuthPanelDescriptor[] }) {
	return (
		<Tabs defaultValue={panels[0]?.id}>
			<TabsList className="w-full">
				{panels.map((panel) => (
					<TabsTrigger key={panel.id} value={panel.id} className="flex-1">
						{panel.label}
					</TabsTrigger>
				))}
			</TabsList>

			{panels.map((panel) => {
				const Component = panel.component;
				return (
					<TabsContent
						key={panel.id}
						value={panel.id}
						forceMount
						className="data-[state=inactive]:hidden"
					>
						<Component />
					</TabsContent>
				);
			})}
		</Tabs>
	);
}
