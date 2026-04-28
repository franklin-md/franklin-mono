import type { AuthPanelDescriptor } from './types.js';
import { ApiKeyPanel } from './api-key/panel.js';
import { OAuthPanel } from './oauth/panel.js';

export const apiKeyPanel: AuthPanelDescriptor = {
	id: 'apiKeys',
	label: 'API Keys',
	component: ApiKeyPanel,
};

export const oauthPanel: AuthPanelDescriptor = {
	id: 'oauth',
	label: 'OAuth Providers',
	component: OAuthPanel,
};
