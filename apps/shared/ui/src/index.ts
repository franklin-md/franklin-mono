// lib
export { cn } from './lib/cn.js';
export { displayUrl, faviconUrl } from './lib/display-url.js';
export {
	PortalContainerProvider,
	usePortalContainer,
} from './lib/portal-container.js';
export {
	ApplicationProvider,
	type ApplicationProviderProps,
} from './application-context.js';

// primitives (shadcn/radix base components)
export { Badge, badgeVariants, type BadgeProps } from './primitives/badge.js';
export {
	Button,
	buttonVariants,
	type ButtonProps,
} from './primitives/button.js';
export {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from './primitives/card.js';
export {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from './primitives/command.js';
export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from './primitives/dialog.js';
export { Checkbox } from './primitives/checkbox.js';
export { Input } from './primitives/input.js';
export { Label, labelVariants } from './primitives/label.js';
export {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from './primitives/popover.js';
export {
	ScrollArea,
	ScrollBar,
	ScrollCorner,
	ScrollRoot,
	ScrollViewport,
} from './primitives/scroll-area.js';
export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from './primitives/select.js';
export { Switch, type SwitchProps } from './primitives/switch.js';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './primitives/tabs.js';
export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './primitives/tooltip.js';
export {
	textInputSurfaceClassName,
	textareaClassName,
} from './primitives/textarea.js';

// Compact interactive popovers
export { CompactPopover } from './compact-popover/popover.js';
export { IconActionGroup } from './compact-popover/actions.js';
export type {
	FloatingAnchor,
	IconAction,
	CompactPopoverProps,
	IconActionGroupProps,
} from './compact-popover/types.js';

// components (derived, application-specific)
export { AutoGrowTextarea } from './components/auto-grow-textarea.js';
export {
	InspectDumpButton,
	type InspectDumpButtonProps,
} from './components/inspect-dump-button.js';
export { IconButton, type IconButtonProps } from './components/icon-button.js';
export { DeleteButton } from './components/delete-button.js';
export { Favicon, type FaviconProps } from './components/favicon.js';
export {
	FileBadge,
	type FileBadgeProps,
} from './components/file-icon/badge.js';
export { StatusDot, type StatusDotProps } from './components/status-dot.js';
export {
	StatusIcon,
	type StatusIconProps,
	type StatusIconStatus,
} from './components/status-icon.js';
export {
	StatusIndicator,
	type StatusIndicatorProps,
} from './components/status-indicator.js';
export {
	EXT_ICONS,
	FILENAME_ICONS,
	type IconEntry,
} from './components/file-icon/branding.js';
export { FileIcon, type FileIconProps } from './components/file-icon/icon.js';
export { AgentTabs } from './agent-tabs/tabs.js';
export {
	ForkButton,
	type ForkButtonProps,
} from './agent-selector/fork-button.js';

// conversation
export {
	ConversationView,
	type ConversationViewProps,
} from './conversation/view.js';
export {
	ConversationTranscript,
	type ConversationTranscriptProps,
} from './conversation/transcript.js';
export { ConversationOnboardingPlaceholder } from './onboarding/conversation-placeholder.js';
export {
	PromptContainer,
	type PromptContainerProps,
} from './conversation/input/prompt-container.js';
export {
	PromptHeader,
	type PromptHeaderProps,
} from './conversation/input/prompt-header.js';
export { PromptEditor } from './conversation/input/editor-prompt/editor.js';
export {
	PromptFooter,
	type PromptFooterProps,
} from './conversation/input/prompt-footer.js';
export {
	PromptFooterControlGroup,
	PromptFooterControls,
	type PromptFooterControlGroupProps,
	type PromptFooterControlsProps,
} from './conversation/input/prompt-footer-controls.js';
export { SharedPromptAgentControl } from './conversation/input/shared-prompt-agent-control.js';
export { PromptSurface } from './conversation/input/prompt-surface.js';
export { PromptSubmitButton } from './conversation/input/prompt-submit-button.js';
export { ThinkingControl } from './conversation/input/thinking/control.js';
export { ThinkingToggle } from './conversation/input/thinking-toggle.js';
export { ModelPicker } from './conversation/input/model-selector/picker.js';
export { ModelPickerRoot } from './conversation/input/model-selector/root.js';
export { ModelPickerTrigger } from './conversation/input/model-selector/trigger.js';
export { ModelPickerContent } from './conversation/input/model-selector/content.js';
export { ModelPickerModels } from './conversation/input/model-selector/models.js';
export { ModelPickerSearch } from './conversation/input/model-selector/search.js';
export { ModelPickerList } from './conversation/input/model-selector/list.js';
export { ModelPickerFooter } from './conversation/input/model-selector/footer.js';
export { ModelPickerEffort } from './conversation/input/model-selector/effort.js';
export type {
	ModelPickerProps,
	ModelPickerRootProps,
	ModelPickerEffortProps,
	ProviderActionRenderer,
} from './conversation/input/model-selector/types.js';
export { ModelSelector } from './conversation/input/model-selector/selector.js';
export {
	ProviderIcon,
	ModelIcon,
} from './conversation/input/provider-icons.js';
export { TextBlock } from './conversation/turn/text/text.js';
export { ThinkingBlock } from './conversation/turn/thinking.js';
export {
	Markdown,
	type CustomMarkdownElement,
	type CustomMarkdownElements,
	type MarkdownExtensions,
	type MarkdownProps,
} from './conversation/turn/markdown.js';
export { UserBubble } from './conversation/turn/user-bubble.js';
export { CopyButton } from './conversation/turn/copy-button.js';
export { ToolCardChrome } from './conversation/tools/chrome.js';
export {
	ToolSummary,
	ToolSummaryDetail,
} from './conversation/tools/summary.js';
export { iconEntry, toolEntry } from './conversation/tools/entry.js';
export {
	defaultToolRegistry,
	defaultToolRenderers,
} from './conversation/tools/registry/index.js';
export { defaultRegistry as defaultTurnEndRegistry } from './conversation/turn/turn-end/registry.js';

// auth
export { AuthButton, type AuthButtonProps } from './auth/auth-button/button.js';
export { AuthSettingsTrigger } from './auth/auth-button/trigger.js';
export { DefaultAuthActionProvider } from './auth/default-action-provider.js';
export { AuthModalContent } from './auth/settings-page/modal.js';
export { apiKeyPanel, oauthPanel } from './auth/settings-page/panels.js';
export type {
	AuthPanelDescriptor,
	AuthPanelProps,
} from './auth/settings-page/types.js';
export { LoginProviderButton } from './auth/login-button/button.js';
export { AnthropicLoginButton } from './auth/login-button/anthropic.js';
export { OpenAICodexLoginButton } from './auth/login-button/openai-codex.js';
export type { LoginProviderButtonProps } from './auth/login-button/button.js';
export { isOAuthFlowRunning } from './auth/login-button/flow.js';

// sidebar
export { AgentSidebar } from './sidebar/agent-sidebar.js';
export { AgentSidebarItem } from './sidebar/agent-sidebar-item.js';
export { SidebarItem } from './sidebar/sidebar-item.js';

export { MODEL_CATALOG } from './conversation/input/models/catalog.js';
export type {
	CatalogModel,
	ProviderGroup,
} from './conversation/input/models/catalog.js';
