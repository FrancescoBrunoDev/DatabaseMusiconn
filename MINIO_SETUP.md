# Minio Setup for Private Tile Hosting

This project uses a private Minio instance to host map tiles. Follow these steps to set up your environment:

## Environment Variables

Copy the `.env.dev` file and update with your credentials:

```bash
cp .env.dev .env.local
```

Required variables:

- `MINIO_ENDPOINT`: The hostname of your Minio server (e.g., `minio-y8sgkwgsc0wogosk4gc844kk.francesco-bruno.com`)
- `MINIO_PORT`: The port number (usually `443` for HTTPS)
- `MINIO_USE_SSL`: Set to `true` for HTTPS connections
- `MINIO_ACCESS_KEY`: Your Minio access key
- `MINIO_SECRET_KEY`: Your Minio secret key

## How It Works

The application uses a server endpoint (`/api/presigned-url`) to generate temporary authenticated URLs for accessing private tile files in Minio. This prevents direct access to the files while still allowing the map to load them.

When the map component loads:

1. It requests a presigned URL from the server
2. The server authenticates with Minio and generates a temporary URL
3. The map component loads the tiles using the temporary URL

## Troubleshooting

- If the map fails to load, check that your Minio credentials are correct
- Make sure the bucket and object names in the presigned URL request match your Minio setup
- The default expiry time for presigned URLs is 1 hour (3600 seconds) - adjust as needed
