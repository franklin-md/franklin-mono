import { base64 } from '@franklin/lib';
import type { ReferenceHandler } from '../../modules/references/api/index.js';
import { isSupportedImageType } from '../filesystem/common/supported.js';
import { referenceHandlerExtension } from './handler.js';

const imageDocumentReferenceHandler: ReferenceHandler = {
	test(reference) {
		return (
			reference.data?.type === 'bytes' &&
			reference.data.mime !== undefined &&
			isSupportedImageType(reference.data.mime)
		);
	},
	toContext(reference) {
		const data = reference.data;
		if (data?.type !== 'bytes' || data.mime === undefined) {
			return {
				content: [
					{
						type: 'text',
						text: 'Reference unavailable: Image bytes are required.',
					},
				],
				isError: true,
			};
		}
		return {
			content: [
				{
					type: 'image',
					data: base64(data.bytes),
					mimeType: data.mime,
				},
			],
		};
	},
};

export const imageDocumentReferenceExtension = referenceHandlerExtension(
	imageDocumentReferenceHandler,
);
