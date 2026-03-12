export type PermissionDecision = 'allow' | 'deny';

export type PermissionRequest = {
	kind: 'generic';
	message: string;
};

export type PermissionResolution = {
	decision: PermissionDecision;
};
