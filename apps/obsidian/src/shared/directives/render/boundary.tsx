import { Component } from 'react';
import type { ReactNode } from 'react';

type Props = { fallback: string; children: ReactNode };
type State = { failed: boolean };

export class DirectiveBoundary extends Component<Props, State> {
	state: State = { failed: false };

	static getDerivedStateFromError(): State {
		return { failed: true };
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}
