// lib
export { cn } from './lib/cn.js';
export { displayUrl, faviconUrl } from './lib/display-url.js';
export {
	PortalContainerProvider,
	usePortalContainer,
} from './lib/portal-container.js';

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
export { Input } from './primitives/input.js';
export {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from './primitives/popover.js';
export { ScrollArea, ScrollBar } from './primitives/scroll-area.js';
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
export { Tabs, TabsContent, TabsList, TabsTrigger } from './primitives/tabs.js';
export { textareaClassName } from './primitives/textarea.js';

// components (derived, application-specific)
export { AutoGrowTextarea } from './components/auto-grow-textarea.js';
export {
	InspectDumpButton,
	type InspectDumpButtonProps,
} from './components/inspect-dump-button.js';
export { DeleteButton } from './components/delete-button.js';
export { Favicon, type FaviconProps } from './components/favicon.js';
export { FileBadge, type FileBadgeProps } from './components/file-badge.js';
export { StatusDot, type StatusDotProps } from './components/status-dot.js';
export {
	StatusIndicator,
	type StatusIndicatorProps,
} from './components/status-indicator.js';
export {
	EXT_ICONS,
	FILENAME_ICONS,
	FileIcon,
	type FileIconProps,
	type IconEntry,
} from './components/file-icon.js';
export {
	TextareaGroup,
	type TextareaGroupProps,
} from './components/textarea-group.js';
export { AgentTabs } from './agent-tabs/tabs.js';

// conversation
export {
	ConversationPanel,
	type ConversationPanelProps,
} from './conversation/panel.js';
export {
	ConversationView,
	type ConversationViewProps,
} from './conversation/view.js';
export { PromptInput } from './conversation/input/prompt-input.js';
export { ThinkingToggle } from './conversation/input/thinking-toggle.js';
export { ModelSelector } from './conversation/input/model-selector/selector.js';
export {
	ProviderIcon,
	ModelIcon,
} from './conversation/input/provider-icons.js';
export { TextBlock } from './conversation/turn/text/text.js';
export { ThinkingBlock } from './conversation/turn/thinking.js';
export { UserBubble } from './conversation/turn/user-bubble.js';
export { CopyButton } from './conversation/turn/text/chrome/copy.js';
export { ToolCardChrome } from './conversation/tools/chrome.js';
export { StatusIcon } from './conversation/tools/status-icon.js';
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
export { AuthModalContent } from './auth/modal.js';
export { AuthButton } from './auth/button.js';
export { useAuthManager } from './auth/context.js';
export { apiKeyPanel, oauthPanel } from './auth/panels.js';
export type { AuthPanelDescriptor, AuthPanelProps } from './auth/types.js';

// sidebar
export { AgentSidebar } from './sidebar/agent-sidebar.js';
export { AgentSidebarItem } from './sidebar/agent-sidebar-item.js';
export { SidebarItem } from './sidebar/sidebar-item.js';
