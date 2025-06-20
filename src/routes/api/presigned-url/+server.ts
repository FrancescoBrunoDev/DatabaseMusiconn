import { Client } from 'minio';
import { error, json } from '@sveltejs/kit';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables from .env and .env.dev if available
config();

// Try to load from .env.dev if available
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../../');
try {
    const envDevPath = join(projectRoot, '.env.dev');
    const envContent = readFileSync(envDevPath, 'utf8');
    const envVars = envContent.split('\n').reduce<Record<string, string>>((acc, line) => {
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                acc[key.trim()] = value.trim();
            }
        }
        return acc;
    }, {});

    Object.entries(envVars).forEach(([key, value]) => {
        if (key && !process.env[key]) {
            process.env[key] = value;
        }
    });
} catch (err) {
    console.warn('No .env.dev file found, using default environment variables');
}

// Initialize Minio client with environment variables
const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'minio-y8sgkwgsc0wogosk4gc844kk.francesco-bruno.com',
    port: parseInt(process.env.MINIO_PORT || '443'),
    useSSL: process.env.MINIO_USE_SSL !== 'false',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || ''
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
