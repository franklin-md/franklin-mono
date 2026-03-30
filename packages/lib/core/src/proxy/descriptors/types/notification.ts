export const NOTIFICATION_KIND = Symbol('proxy.notification');

export interface NotificationDescriptor<_TArgs extends unknown[] = unknown[]> {
	readonly kind: typeof NOTIFICATION_KIND;
}
