import { getLocationInfo, joinEventByYear } from '$databaseMusiconn/lib/dataMusiconn.server';
import { getLocationMeta } from '$databaseMusiconn/lib/musiconnApi';
import { mainLocationID } from '$databaseMusiconn/stores/storeEvents';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import type { PageServerLoad } from './$types';

// Use a cache object that stores data by location ID
const cache: Record<
	string,
	{
		events: Events | Promise<Events>;
		startYear: number;
		endYear: number;
		locationInfo: LocationInfo;
		timeline: { [year: string]: number };
		timestamp: number; // Add timestamp for cache invalidation if needed
	}
> = {};

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
	const needsFreshData =
		!cache[currentLocationId] || Date.now() - cache[currentLocationId].timestamp > 3600000; // 1 hour cache

	if (needsFreshData) {
		try {
			// 1) Fast metadata (~0.1s): ship the per-year timeline first so the line
			//    graph renders instantly, before the detailed event list streams in.
			const meta = await getLocationMeta(Number(params.mainLocationID));
			const locationInfo = await getLocationInfo(get(mainLocationID));

			cache[currentLocationId] = {
				events: joinEventByYear()
					.then((res) => {
						// Replace the streaming promise with the resolved events in the cache so
						// subsequent requests get the data synchronously.
						if (cache[currentLocationId]) cache[currentLocationId].events = res.event;
						return res.event;
					})
					.catch((error) => {
						console.error('An error occurred while fetching events:', error);
						return {} as Events;
					}),
				startYear: meta.firstYear || 1850,
				endYear: meta.lastYear || 1900,
				locationInfo,
				timeline: meta.timeline,
				timestamp: Date.now()
			};
		} catch (error) {
			console.error('An error occurred while fetching location info:', error);
			// Initialize with empty data if not already cached
			if (!cache[currentLocationId]) {
				cache[currentLocationId] = {
					events: {} as Events,
					startYear: 0,
					endYear: 0,
					locationInfo: {} as LocationInfo,
					timeline: {},
					timestamp: Date.now()
				};
			}
		}
	}

	const currentCache =
		cache[currentLocationId] ||
		{
			events: {} as Events,
			startYear: 0,
			endYear: 0,
			locationInfo: {} as LocationInfo,
			timeline: {}
		};

	return {
		props: {
			events: currentCache.events,
			startYear: currentCache.startYear,
			endYear: currentCache.endYear,
			locationInfo: currentCache.locationInfo,
			timeline: currentCache.timeline
		}
	};
};