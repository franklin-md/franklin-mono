import { Loader2, Check, X } from 'lucide-react';

import type { ToolStatus } from '@franklin/react';

export function StatusIcon({ status }: { status: ToolStatus }) {
	switch (status) {
		case 'in-progress':
			return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
		case 'success':
			return <Check className="h-3 w-3 text-emerald-500" />;
		case 'error':
			return <X className="h-3 w-3 text-destructive" />;
	}
}
