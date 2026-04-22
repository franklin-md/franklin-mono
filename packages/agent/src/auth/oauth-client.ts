import type { OAuthCredentials } from './credentials.js';
import { runAuthorizationCodePkce, type PkceHost } from './engine.js';
import { OAuthFlow } from './oauth-flow.js';
import type { AuthorizationCodePkceSpec } from './specs/types.js';

export class OAuthClient {
	constructor(
		private readonly specs: Map<string, AuthorizationCodePkceSpec>,
		private readonly host: PkceHost,
	) {}

	createFlow(providerId: string): OAuthFlow {
		const spec = this.requireSpec(providerId);
		return new OAuthFlow((callbacks) =>
			runAuthorizationCodePkce(spec, this.host, callbacks),
		);
	}

	async refresh(
		providerId: string,
		credentials: OAuthCredentials,
	): Promise<OAuthCredentials> {
		const spec = this.requireSpec(providerId);
		return spec.refresh(credentials, this.host.fetch);
	}

	getApiKey(providerId: string, credentials: OAuthCredentials): string {
		const spec = this.requireSpec(providerId);
		return spec.getApiKey(credentials);
	}

	providers(): { id: string; name: string }[] {
		return [...this.specs.values()].map(({ id, name }) => ({ id, name }));
	}

	private requireSpec(providerId: string): AuthorizationCodePkceSpec {
		const spec = this.specs.get(providerId);
		if (!spec) throw new Error(`OAuth provider "${providerId}" not found`);
		return spec;
	}
}
