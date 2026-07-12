import { getLocationInfo, streamEventsForLocation } from '$databaseMusiconn/lib/dataMusiconn.server';
import { mainLocationID } from '$databaseMusiconn/stores/storeEvents';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// if a param.mainLocationID is given the use that instead of the mainLocationID store.
	// It must be a number
	if (!params.mainLocationID || isNaN(Number(params.mainLocationID))) {
		// redirect to the main location page
		redirect(302, '/database');
	} else {
		mainLocationID.set(Number(params.mainLocationID));
	}

	const id = Number(params.mainLocationID);

	try {
		// Fast metadata (~0.15s) + streamed per-page event promises. SvelteKit
		// streams each promise individually so the shell + line graph render
		// instantly and the event list fills in with a real progress bar.
		const [locationInfo, streamed] = await Promise.all([
			getLocationInfo(get(mainLocationID)),
			streamEventsForLocation(id)
		]);

		return {
			props: {
				events: {} as Events, // events now stream via eventPages
				startYear: streamed.firstYear,
				endYear: streamed.lastYear,
				locationInfo,
				timeline: streamed.timeline,
				totalPages: streamed.totalPages,
				eventPages: streamed.eventPages
			}
		};
	} catch (error) {
		console.error('An error occurred while fetching location info:', error);
		return {
			props: {
				events: {} as Events,
				startYear: 0,
				endYear: 0,
				locationInfo: {} as LocationInfo,
				timeline: {},
				totalPages: 0,
				eventPages: []
			}
		};
	}
};