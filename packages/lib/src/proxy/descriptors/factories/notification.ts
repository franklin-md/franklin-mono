import type { NotificationDescriptor } from '../types/notification.js';
import { NOTIFICATION_KIND } from '../types/notification.js';

type AnyNotificationMethod = (...args: any[]) => Promise<void>;

export function notification<
	TMethod extends AnyNotificationMethod,
>(): NotificationDescriptor<Parameters<TMethod>> {
	return { kind: NOTIFICATION_KIND };
}
