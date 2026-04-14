import type { ComponentType } from 'react';

import { cn, Button } from '@franklin/ui';
import { Icons, type IconProps } from '@franklin/react';
import { Loader2 } from 'lucide-react';

import type { FlowState, OAuthProviderMeta } from './types.js';
import { OAuthFlowView } from './flow-view.js';

// ---------------------------------------------------------------------------
// Provider → icon mapping
// ---------------------------------------------------------------------------

const PROVIDER_ICONS: Record<string, ComponentType<IconProps>> = {
	anthropic: Icons.Anthropic,
	'openai-codex': Icons.Codex,
};

// ---------------------------------------------------------------------------
// ProviderRow
// ---------------------------------------------------------------------------

export function ProviderRow({
	provider,
	isSignedIn,
	flowState,
	isActive,
	onLogin,
	onRemove,
	onDismiss,
}: {
	provider: OAuthProviderMeta;
	isSignedIn: boolean;
	flowState: FlowState;
	isActive: boolean;
	onLogin: (provider: OAuthProviderMeta) => void;
	onRemove: (providerId: string) => void;
	onDismiss: () => void;
}) {
	const Icon = PROVIDER_ICONS[provider.id];
	const flowDone =
		isActive && (flowState.phase === 'success' || flowState.phase === 'error');
	const flowRunning = isActive && !flowDone && flowState.phase !== 'idle';

	return (
		<div className="overflow-hidden rounded-md ring-1 ring-border">
			<div className="flex items-center gap-3 px-3.5 py-2.5">
				{/* Provider icon — full colour when signed in, muted when not */}
				{Icon && (
					<div
						className={cn(
							'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
							isSignedIn
								? 'bg-primary/10 ring-1 ring-primary/30'
								: 'opacity-40 grayscale',
						)}
					>
						<Icon size={18} />
					</div>
				)}

				<span className="flex-1 text-sm font-medium text-foreground">
					{provider.name}
				</span>

				<Button
					size="sm"
					onClick={() => {
						onLogin(provider);
					}}
					disabled={flowRunning}
				>
					{flowRunning && (
						<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
					)}
					{isSignedIn ? 'Re-authenticate' : 'Sign in'}
				</Button>

				{isSignedIn && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							onRemove(provider.id);
						}}
						disabled={flowRunning}
					>
						Remove
					</Button>
				)}
			</div>

			{isActive && flowState.phase !== 'idle' && (
				<OAuthFlowView state={flowState} onDismiss={onDismiss} />
			)}
		</div>
	);
}
