import type { Components } from 'streamdown';

export const bareComponents = {
	// Streamdown passes a HAST `node` prop to custom components; drop it before forwarding DOM props.
	h1: ({ children, node: _node, ...rest }) => <h1 {...rest}>{children}</h1>,
	h2: ({ children, node: _node, ...rest }) => <h2 {...rest}>{children}</h2>,
	h3: ({ children, node: _node, ...rest }) => <h3 {...rest}>{children}</h3>,
	h4: ({ children, node: _node, ...rest }) => <h4 {...rest}>{children}</h4>,
	h5: ({ children, node: _node, ...rest }) => <h5 {...rest}>{children}</h5>,
	h6: ({ children, node: _node, ...rest }) => <h6 {...rest}>{children}</h6>,
	ul: ({ children, node: _node, ...rest }) => <ul {...rest}>{children}</ul>,
	ol: ({ children, node: _node, ...rest }) => <ol {...rest}>{children}</ol>,
	li: ({ children, node: _node, ...rest }) => <li {...rest}>{children}</li>,
	blockquote: ({ children, node: _node, ...rest }) => (
		<blockquote {...rest}>{children}</blockquote>
	),
	hr: ({ node: _node, ...rest }) => <hr {...rest} />,
} satisfies Components;
