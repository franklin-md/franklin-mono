
/** Distinguishes authentication failure kinds in a TurnEnd error. */
export type OAuthError = 'oauth';
export type APIKeyError = 'apiKey';

export type AuthError = OAuthError | APIKeyError;