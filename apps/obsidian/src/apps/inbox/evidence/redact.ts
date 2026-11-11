export function redactEvidence(
	text: string,
	secrets: readonly string[] = [],
): string {
	let clean = text;
	for (const secret of secrets) {
		if (secret) clean = clean.replaceAll(secret, '[REDACTED]');
	}
	// These are evidence fields, never the transport/configuration object. Also
	// scrub credentials accidentally echoed in a file, URL, or tool error.
	return clean
		.replace(
			/\b(?:Bearer|Basic)\s+[a-z\d._~+/-]+=*/gi,
			'[REDACTED authorization]',
		)
		.replace(
			/\b(?:sk-|sk_ant_|ghp_|github_pat_|xox[baprs]-)[a-z\d_-]{8,}/gi,
			'[REDACTED token]',
		)
		.replace(
			/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passphrase|client[_-]?secret|private[_-]?key|secret|authorization|cookie|x-amz-signature|x-amz-credential|x-goog-signature|signature)["']?\s*[:=]\s*["']?)([^\s"'&,}]+)/gi,
			'$1[REDACTED]',
		)
		.replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@');
}
