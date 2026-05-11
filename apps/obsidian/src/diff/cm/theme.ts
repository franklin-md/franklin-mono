import { EditorView } from '@codemirror/view';

const actionHostSelector = [
	'.diff-plugin-actions-host',
	'.diff-plugin-embedded-actions-host',
].join(', ');

export const diffTheme = EditorView.baseTheme({
	'&': {
		'--diff-plugin-added-bg': 'rgba(var(--color-green-rgb), 0.08)',
		'--diff-plugin-added-border': 'rgba(var(--color-green-rgb), 0.42)',
		'--diff-plugin-added-edge': 'rgba(var(--color-green-rgb), 0.18)',
		'--diff-plugin-removed-bg': 'rgba(var(--color-red-rgb), 0.06)',
		'--diff-plugin-removed-border': 'rgba(var(--color-red-rgb), 0.42)',
		'--diff-plugin-removed-text':
			'color-mix(in srgb, var(--text-normal) 86%, rgb(var(--color-red-rgb)))',
		'--diff-plugin-table-cell-bg':
			'color-mix(in srgb, var(--diff-plugin-added-bg) 55%, var(--background-primary))',
	},

	'.diff-plugin-widget-host': {
		position: 'relative',
		zIndex: '2',
		overflow: 'visible',
		pointerEvents: 'auto',
		margin: '0',
		font: 'inherit',
	},

	'.diff-plugin-widget': {
		display: 'block',
		position: 'relative',
		font: 'inherit',
	},

	'.cm-line:has(.diff-plugin-actions-host)': {
		position: 'relative',
	},

	[actionHostSelector]: {
		fontFamily: 'inherit',
		fontSize: '1rem',
		lineHeight: '1.5',
	},

	'.diff-plugin-actions-host': {
		display: 'inline',
		width: '0',
		height: '0',
		overflow: 'visible',
	},

	'.diff-plugin-actions': {
		position: 'absolute',
		top: '0',
		right: '0',
		zIndex: '20',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: '4px',
		height: 'auto',
		padding: '0',
		pointerEvents: 'auto',
	},

	'.diff-plugin-actions-block': {
		boxSizing: 'border-box',
		width: '100%',
		minWidth: '100%',
		alignSelf: 'stretch',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: '4px',
		padding: '4px 0',
		pointerEvents: 'auto',
	},

	'.diff-plugin-added-embedded-widget.cm-embed-block': {
		position: 'relative',
		isolation: 'isolate',
	},

	'.diff-plugin-added-embedded-widget.cm-embed-block::before': {
		content: '""',
		position: 'absolute',
		inset:
			'0 var(--diff-plugin-embed-padding-right, 0px) 0 var(--diff-plugin-embed-padding-left, 0px)',
		background: 'var(--diff-plugin-added-bg)',
		pointerEvents: 'none',
		zIndex: '-1',
	},

	'.diff-plugin-embedded-actions-host': {
		position: 'absolute',
		top: '8px',
		right: '40px',
		zIndex: '20',
		display: 'flex',
		alignItems: 'center',
		gap: '4px',
		opacity: '0',
		pointerEvents: 'none',
		transition: 'opacity 120ms ease',
	},

	'.diff-plugin-added-embedded-widget:hover .diff-plugin-embedded-actions-host, .diff-plugin-added-embedded-widget:focus-within .diff-plugin-embedded-actions-host':
		{
			opacity: '1',
			pointerEvents: 'auto',
		},

	'.diff-plugin-actions-separator': {
		width: '1px',
		height: '14px',
		margin: '0 2px',
		background: 'var(--background-modifier-border)',
	},

	'.diff-plugin-btn': {
		'--diff-plugin-btn-bg': 'transparent',
		'--diff-plugin-btn-border': 'transparent',
		'--diff-plugin-btn-text': 'var(--text-muted)',
		'--diff-plugin-btn-bg-hover': 'var(--background-modifier-hover)',
		'--diff-plugin-btn-border-hover': 'var(--diff-plugin-btn-border)',
		'--diff-plugin-btn-text-hover': 'var(--text-normal)',
		appearance: 'none',
		boxSizing: 'border-box',
		height: 'auto',
		minHeight: '22px',
		padding: '0 8px',
		border: '1px solid var(--diff-plugin-btn-border)',
		borderRadius: 'var(--radius-s, 4px)',
		background: 'var(--diff-plugin-btn-bg)',
		color: 'var(--diff-plugin-btn-text)',
		cursor: 'pointer',
		fontFamily: 'inherit',
		fontSize: '1rem',
		lineHeight: '1.2',
		transition:
			'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
	},

	'.diff-plugin-btn:hover': {
		background: 'var(--diff-plugin-btn-bg-hover)',
		borderColor: 'var(--diff-plugin-btn-border-hover)',
		color: 'var(--diff-plugin-btn-text-hover)',
	},

	'.diff-plugin-btn-accept': {
		'--diff-plugin-btn-bg': 'rgba(var(--color-green-rgb), 0.16)',
		'--diff-plugin-btn-border': 'rgba(var(--color-green-rgb), 0.38)',
		'--diff-plugin-btn-text':
			'color-mix(in srgb, var(--text-normal) 76%, rgb(var(--color-green-rgb)))',
		'--diff-plugin-btn-bg-hover': 'rgba(var(--color-green-rgb), 0.22)',
		'--diff-plugin-btn-border-hover': 'rgba(var(--color-green-rgb), 0.5)',
		'--diff-plugin-btn-text-hover':
			'color-mix(in srgb, var(--text-normal) 70%, rgb(var(--color-green-rgb)))',
	},

	'.diff-plugin-btn-reject': {
		'--diff-plugin-btn-bg': 'var(--background-primary)',
		'--diff-plugin-btn-border': 'var(--background-modifier-border)',
		'--diff-plugin-btn-border-hover': 'var(--background-modifier-border-hover)',
	},

	'.diff-plugin-btn-all': {
		height: 'auto',
		minHeight: '22px',
		lineHeight: 'inherit',
		color: 'var(--text-faint)',
	},

	'.diff-plugin-removed-block': {
		boxSizing: 'border-box',
		display: 'flex',
		flexDirection: 'column',
		gap: '0',
		marginLeft: '-18px',
		marginRight: '-18px',
		padding: '1px 18px 1px 0',
		borderLeft: '4px solid var(--diff-plugin-removed-border)',
		background: 'var(--diff-plugin-removed-bg)',
		font: 'inherit',
	},

	'.diff-plugin-removed-line': {
		padding: '0 14px',
		color: 'var(--diff-plugin-removed-text)',
		font: 'inherit',
		whiteSpace: 'pre-wrap',
	},

	'.diff-plugin-removed-line::before': {
		content: '"- "',
		color: 'rgb(var(--color-red-rgb))',
	},

	'.diff-plugin-added-line': {
		boxSizing: 'border-box',
		marginLeft: '-18px',
		marginRight: '-18px',
		paddingLeft: '14px',
		paddingRight: '18px',
		background: 'var(--diff-plugin-added-bg)',
		borderLeft: '4px solid var(--diff-plugin-added-border)',
	},

	'.diff-plugin-added-line.HyperMD-quote::before': {
		background: 'var(--diff-plugin-added-bg)',
	},

	'.diff-plugin-added-first': {
		borderTop: '2px solid var(--diff-plugin-added-edge)',
	},

	'.diff-plugin-added-last': {
		borderBottom: '2px solid var(--diff-plugin-added-edge)',
	},

	// '.diff-plugin-added-last:has(+ .cm-embed-block.cm-table-widget), .diff-plugin-added-last:has(+ .cm-embed-block:has(table.table-editor)), .diff-plugin-added-last:has(+ .diff-plugin-added-table-widget)':
	// 	{
	// 		borderBottom: 'none',
	// 	},

	// '.diff-plugin-added-line-before-table': {
	// 	borderLeft: 'none',
	// 	paddingLeft: '18px',
	// },

	'.diff-plugin-added-line.HyperMD-codeblock, .diff-plugin-added-line.HyperMD-codeblock-bg':
		{
			borderLeft: '4px solid var(--diff-plugin-added-border)',
			background: 'var(--diff-plugin-added-bg)',
			borderTop: 'none',
			borderBottom: 'none',
		},

	'.diff-plugin-added-diagram-widget': {
		boxSizing: 'border-box',
		marginLeft: '-18px',
		marginRight: '-18px',
		padding: '8px 18px 8px 14px',
		background: 'var(--diff-plugin-added-bg)',
		borderLeft: '4px solid var(--diff-plugin-added-border)',
	},

	'.diff-plugin-added-diagram-widget .mermaid': {
		overflowX: 'auto',
	},

	'.diff-plugin-added-diagram-widget .mermaid > svg': {
		display: 'block',
	},
});
