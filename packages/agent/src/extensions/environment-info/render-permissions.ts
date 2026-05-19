import type { FilesystemPermissions, NetworkPermissions } from '@franklin/lib';

export interface EnvironmentPermissionsFields {
	filesystem: FilesystemPermissions;
	network: NetworkPermissions;
}

function formatPatterns(patterns: readonly string[]): string {
	return patterns.length === 0 ? '(none)' : patterns.join(', ');
}

interface AllowDenyInterpretation {
	rule: string;
	allowLabel: string;
	denyLabel: string;
	cases: {
		empty: string;
		allowOnly: string;
		denyOnly: string;
		allowAndDeny: string;
	};
}

function selectAllowDenyCase(
	interpretation: AllowDenyInterpretation,
	allow: readonly string[],
	deny: readonly string[],
): string {
	const hasAllow = allow.length > 0;
	const hasDeny = deny.length > 0;
	if (hasAllow && hasDeny) {
		return interpretation.cases.allowAndDeny;
	}
	if (hasAllow) {
		return interpretation.cases.allowOnly;
	}
	if (hasDeny) {
		return interpretation.cases.denyOnly;
	}
	return interpretation.cases.empty;
}

function renderAllowDenyPolicy(
	interpretation: AllowDenyInterpretation,
	allow: readonly string[],
	deny: readonly string[],
): string[] {
	return [
		`- ${interpretation.rule}`,
		`- ${selectAllowDenyCase(interpretation, allow, deny)}`,
		`- ${interpretation.allowLabel}: ${formatPatterns(allow)}`,
		`- ${interpretation.denyLabel}: ${formatPatterns(deny)}`,
	];
}

const READ_INTERPRETATION: AllowDenyInterpretation = {
	rule: 'Reads: allowed by default; denyRead blocks matches; allowRead re-allows matches.',
	allowLabel: 'allowRead',
	denyLabel: 'denyRead',
	cases: {
		empty: 'With this config, all paths may be read.',
		allowOnly:
			'With this config, all paths may be read; allowRead does not restrict reads when denyRead is empty.',
		denyOnly:
			'With this config, all paths may be read except denyRead matches.',
		allowAndDeny:
			'With this config, all paths may be read except denyRead matches, with allowRead matches re-allowed.',
	},
};

const WRITE_INTERPRETATION: AllowDenyInterpretation = {
	rule: 'Writes: denied by default; allowWrite allows matches; denyWrite blocks matches.',
	allowLabel: 'allowWrite',
	denyLabel: 'denyWrite',
	cases: {
		empty:
			'With this config, no paths may be written because writes are denied by default.',
		allowOnly: 'With this config, only allowWrite matches may be written.',
		denyOnly:
			'With this config, no paths may be written because writes are denied by default; denyWrite does not further restrict writes without allowWrite.',
		allowAndDeny:
			'With this config, allowWrite matches may be written except denyWrite matches.',
	},
};

const NETWORK_INTERPRETATION: AllowDenyInterpretation = {
	rule: 'Domains: deniedDomains always blocks matching URL hosts; allowedDomains limits access when non-empty.',
	allowLabel: 'allowedDomains',
	denyLabel: 'deniedDomains',
	cases: {
		empty:
			'With this config, public hosts may be accessed. Loopback still requires an explicit allow, and private or link-local hosts are blocked.',
		allowOnly:
			'With this config, only allowedDomains matches may be accessed. Loopback requires an explicit allow, and private or link-local hosts are blocked.',
		denyOnly:
			'With this config, public hosts may be accessed except deniedDomains matches. Loopback still requires an explicit allow, and private or link-local hosts are blocked.',
		allowAndDeny:
			'With this config, only allowedDomains matches may be accessed, except deniedDomains matches. Loopback requires an explicit allow, and private or link-local hosts are blocked.',
	},
};

export function renderEnvironmentPermissions(
	fields: EnvironmentPermissionsFields,
): string {
	return [
		'Configured environment permissions:',
		'Hosts may enforce additional stricter restrictions beyond these configured patterns.',
		'Filesystem:',
		'- Patterns are slash-separated paths relative to filesystem root.',
		...renderAllowDenyPolicy(
			READ_INTERPRETATION,
			fields.filesystem.allowRead,
			fields.filesystem.denyRead,
		),
		...renderAllowDenyPolicy(
			WRITE_INTERPRETATION,
			fields.filesystem.allowWrite,
			fields.filesystem.denyWrite,
		),
		'Network:',
		'- Patterns match domains, including subdomains, or exact host:port targets.',
		'- Loopback hosts require an explicit allow; private and link-local hosts are blocked.',
		...renderAllowDenyPolicy(
			NETWORK_INTERPRETATION,
			fields.network.allowedDomains,
			fields.network.deniedDomains,
		),
	].join('\n');
}
