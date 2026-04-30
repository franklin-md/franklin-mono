// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
	AuthActionProvider,
	useAuthActionHandlers,
	type AuthActionHandlers,
} from '../auth/action-provider.js';

function ReadHandlers({
	onRead,
}: {
	onRead: (handlers: AuthActionHandlers) => void;
}) {
	onRead(useAuthActionHandlers());
	return <div>ready</div>;
}

describe('AuthActionProvider', () => {
	it('provides auth action handlers', () => {
		const requestApiKey = vi.fn();
		const onRead = vi.fn();

		render(
			<AuthActionProvider handlers={{ requestApiKey }}>
				<ReadHandlers onRead={onRead} />
			</AuthActionProvider>,
		);

		expect(screen.getByText('ready')).toBeTruthy();
		expect(onRead).toHaveBeenCalledWith({ requestApiKey });
	});
});
