import { joinEventByYear } from '$lib/dataMusiconn.server';
import type { PageServerLoad } from './$types';

let cachedEvents: Events;

export const load: PageServerLoad = async () => {
	if (!cachedEvents) {
		try {
			cachedEvents = await joinEventByYear();
		} catch (error) {
			console.error('An error occurred while fetching events:', error);
			cachedEvents = {};
		}
	}

	return {
		props: {
			events: cachedEvents
		}
	};
};
