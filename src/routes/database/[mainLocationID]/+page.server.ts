import { joinEventByYear, getLocationInfo } from '$databaseMusiconn/lib/dataMusiconn.server';
import { mainLocationID, useBounderiesYears } from '$databaseMusiconn/stores/storeEvents';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';

// Use a cache object that stores data by location ID
const cache: Record<string, {
	events: Events,
	startYear: number,
	endYear: number,
	locationInfo: LocationInfo,
	timestamp: number // Add timestamp for cache invalidation if needed
}> = {};

export const load: PageServerLoad = async ({ params }) => {
	// if a param.mainLocationID is given the use that instead of the mainLocationID store.
	// It must be a number
	if (!params.mainLocationID || isNaN(Number(params.mainLocationID))) {
		// redirect to the main location page
		redirect(302, '/database');
	} else {
		mainLocationID.set(Number(params.mainLocationID));
	}

	const currentLocationId = params.mainLocationID;

	// Check if we need to fetch new data - either no cached data for this location
	// or the cached data is too old (optional, based on your requirements)
	const needsFreshData = !cache[currentLocationId] ||
		Date.now() - cache[currentLocationId].timestamp > 3600000; // 1 hour cache

	if (needsFreshData) {
		try {
			const res = await joinEventByYear();
			const locationInfo = await getLocationInfo(get(mainLocationID));

			// Update the cache with fresh data
			cache[currentLocationId] = {
				events: res.event,
				startYear: res.startYear,
				endYear: res.endYear,
				locationInfo: locationInfo,
				timestamp: Date.now()
			};
		} catch (error) {
			console.error('An error occurred while fetching events:', error);
			// Initialize with empty data if not already cached
			if (!cache[currentLocationId]) {
				cache[currentLocationId] = {
					events: {},
					startYear: 0,
					endYear: 0,
					locationInfo: {} as LocationInfo,
					timestamp: Date.now()
				};
			}
		}
	}

	const currentCache = cache[currentLocationId] || { events: {}, startYear: 0, endYear: 0, locationInfo: {} as LocationInfo };

	return {
		props: {
			events: currentCache.events,
			startYear: currentCache.startYear,
			endYear: currentCache.endYear,
			locationInfo: currentCache.locationInfo
		}
	};
};
