import { json, type RequestHandler } from '@sveltejs/kit';
import { MUSICONN_API_URL } from '$lib/musiconnApi';

/**
 * Same-origin GraphQL proxy for browser requests.
 *
 * The musiconn API does not allow the browser's JSON preflight, so the client
 * posts here and the server forwards the request without involving CORS.
 */
export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const body = await request.text();
		const response = await fetch(MUSICONN_API_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body
		});

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' }
		});
	} catch (error) {
		console.error('Musiconn GraphQL proxy request failed:', error);
		return json({ error: 'Unable to reach the Musiconn API' }, { status: 502 });
	}
};
