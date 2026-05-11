import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

const R2 = new S3Client({
	region: 'auto',
	endpoint: env.R2_ENDPOINT,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY
	}
});

/**
 * Upload a file buffer to R2 and return its public URL.
 * @param {Buffer|Uint8Array} body
 * @param {string} key  – object key (e.g. "artworks/my-image.webp")
 * @param {string} contentType
 * @returns {Promise<string>} public URL
 */
export async function uploadToR2(body, key, contentType) {
	await R2.send(
		new PutObjectCommand({
			Bucket: env.R2_BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType
		})
	);
	return `${env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete an object from R2.
 * @param {string} key
 */
export async function deleteFromR2(key) {
	await R2.send(
		new DeleteObjectCommand({
			Bucket: env.R2_BUCKET,
			Key: key
		})
	);
}
