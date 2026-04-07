import type { SVGProps } from 'react';

// TODO: refactor icons into shared component library
type IconProps = SVGProps<SVGSVGElement>;

function AnthropicIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M13.827 3L21 21h-4.31l-7.173-18h4.31Zm-3.654 0L3 21h4.31L10.173 3H7.827Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function OpenAIIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.042 6.042 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.998 5.998 0 0 0 3.997-2.9 6.034 6.034 0 0 0-.747-7.073ZM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494ZM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646ZM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872v.024Zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667Zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66v.018ZM8.318 12.978l-2.02-1.164a.08.08 0 0 1-.038-.057V6.179a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.714 5.57a.795.795 0 0 0-.392.68l-.004 6.729ZM9.41 11.2l2.6-1.501 2.6 1.501v3.003l-2.6 1.501-2.6-1.501V11.2Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function OpenRouterIcon(props: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3v4H7v2h4v4h2v-4h4v-2h-4V7h-2Z"
				fill="currentColor"
			/>
		</svg>
	);
}

const PROVIDER_ICONS: Record<string, (props: IconProps) => React.ReactElement> =
	{
		anthropic: AnthropicIcon,
		'openai-codex': OpenAIIcon,
		openrouter: OpenRouterIcon,
	};

export function ProviderIcon({
	provider,
	...props
}: { provider: string } & IconProps) {
	const Icon = PROVIDER_ICONS[provider];
	if (!Icon) return null;
	return <Icon {...props} />;
}
