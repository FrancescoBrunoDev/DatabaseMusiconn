import {
	MINIO_ACCESS_KEY,
	MINIO_ENDPOINT,
	MINIO_PORT,
	MINIO_SECRET_KEY,
	MINIO_USE_SSL,
	PROTOMAP_V
} from '$env/static/private';
import { error, json } from '@sveltejs/kit';
import { config } from 'dotenv';
import { Client } from 'minio';

// Load environment variables from .env file
config();

// Initialize Minio client with environment variables
const minioClient = new Client({
	endPoint: MINIO_ENDPOINT,
	port: parseInt(MINIO_PORT),
	useSSL: MINIO_USE_SSL !== 'false',
	accessKey: MINIO_ACCESS_KEY,
	secretKey: MINIO_SECRET_KEY
});

export async function GET({ url }: { url: URL }) {
	try {
		// Get parameters from URL
		const bucket = 'protomaps';
		const objectName = `${PROTOMAP_V}.pmtiles`;
		const expirySeconds = parseInt(url.searchParams.get('expiry') || '300'); // Default 5 minutes

		// Generate a presigned URL for temporary access
		const presignedUrl = await minioClient.presignedGetObject(bucket, objectName, expirySeconds);

		return json({ url: presignedUrl });
	} catch (err) {
		console.error('Error generating presigned URL:', err);
		throw error(500, 'Failed to generate presigned URL for Minio object');
	}
}
