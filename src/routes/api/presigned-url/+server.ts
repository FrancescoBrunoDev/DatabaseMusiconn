import { Client } from 'minio';
import { error, json } from '@sveltejs/kit';
import { config } from 'dotenv';
import { MINIO_ACCESS_KEY, MINIO_ENDPOINT, MINIO_PORT, MINIO_SECRET_KEY, MINIO_USE_SSL } from '$env/static/private';

// Load environment variables from .env file
config();

// Initialize Minio client with environment variables
const minioClient = new Client({
    endPoint: MINIO_ENDPOINT || 'minio-y8sgkwgsc0wogosk4gc844kk.francesco-bruno.com',
    port: parseInt(MINIO_PORT || '443'),
    useSSL: MINIO_USE_SSL !== 'false',
    accessKey: MINIO_ACCESS_KEY || '',
    secretKey: MINIO_SECRET_KEY || ''
});

export async function GET({ url }: { url: URL }) {
    try {
        // Get parameters from URL
        const bucket = url.searchParams.get('bucket') || 'protomaps';
        const objectName = url.searchParams.get('object') || '20250620.pmtiles';
        const expirySeconds = parseInt(url.searchParams.get('expiry') || '3600'); // Default 1 hour

        // Generate a presigned URL for temporary access
        const presignedUrl = await minioClient.presignedGetObject(
            bucket,
            objectName,
            expirySeconds
        );

        return json({ url: presignedUrl });
    } catch (err) {
        console.error('Error generating presigned URL:', err);
        throw error(500, 'Failed to generate presigned URL for Minio object');
    }
}
