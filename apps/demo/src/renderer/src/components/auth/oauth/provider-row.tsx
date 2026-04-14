import type { ComponentType } from 'react';

import { cn, Button } from '@franklin/ui';
import { Icons, type IconProps } from '@franklin/react';
import { Loader2, Check } from 'lucide-react';

import type { OAuthProviderMeta } from './types.js';
import { OAuthFlowView } from './flow-view.js';
import { useOAuthFlow } from './hook.js';

// ---------------------------------------------------------------------------
// Provider → icon + display-name mapping
// ---------------------------------------------------------------------------

const PROVIDER_ICONS: Record<string, ComponentType<IconProps>> = {
	anthropic: Icons.Anthropic,
	'openai-codex': Icons.OpenAI,
};

const PROVIDER_LABELS: Record<string, string> = {
	anthropic: 'Anthropic',
	'openai-codex': 'ChatGPT',
};

// ---------------------------------------------------------------------------
// ProviderRow
// ---------------------------------------------------------------------------

export function ProviderRow({
	provider,
	isSignedIn,
	onUpdate,
}: {
	provider: OAuthProviderMeta;
	isSignedIn: boolean;
	onUpdate: () => Promise<void>;
}) {
	const { flowState, login, remove, dismiss } = useOAuthFlow(
		provider.id,
		onUpdate,
	);

	const Icon = PROVIDER_ICONS[provider.id];
	const flowDone =
		flowState.phase === 'success' || flowState.phase === 'error';
	const flowRunning = !flowDone && flowState.phase !== 'idle';

	return (
		<div className="overflow-hidden rounded-md ring-1 ring-border">
			<div className="flex items-center gap-3 px-3.5 py-2.5">
				{Icon && (
					<div className="relative shrink-0">
						<div
							className={cn(
								'flex h-8 w-8 items-center justify-center rounded-md bg-white text-black',
							)}
						>
							<Icon size={18} />
						</div>
						{isSignedIn && (
							<div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-background">
								<Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
							</div>
						)}
					</div>
				)}

				<span className="flex-1 text-sm font-medium text-foreground">
					{PROVIDER_LABELS[provider.id] ?? provider.name}
				</span>

				<Button
					size="sm"
					onClick={() => {
						void login();
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
						onClick={remove}
						disabled={flowRunning}
					>
						Remove
					</Button>
				)}
			</div>

			{flowState.phase !== 'idle' && (
				<OAuthFlowView state={flowState} onDismiss={dismiss} />
			)}
		</div>
	);
}
