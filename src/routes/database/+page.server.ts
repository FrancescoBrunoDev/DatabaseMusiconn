import { joinEventByYear } from '$lib/dataMusiconn.server';
import type { PageServerLoad } from './$types';

let cachedEvents: Events;
let startYear: number;
let endYear: number;

export const load: PageServerLoad = async () => {
	if (!cachedEvents) {
		try {
			const res = await joinEventByYear();
			cachedEvents = res.event;
			startYear = res.startYear;
			endYear = res.endYear;
		} catch (error) {
			console.error('An error occurred while fetching events:', error);
			cachedEvents = {};
		}
	}

	return {
		props: {
			events: cachedEvents,
			startYear: startYear,
			endYear: endYear
		}
	};
};
