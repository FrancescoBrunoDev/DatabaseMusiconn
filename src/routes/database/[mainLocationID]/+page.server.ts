import { joinEventByYear, getLocationInfo } from '$databaseMusiconn/lib/dataMusiconn.server';
import { mainLocationID, useBounderiesYears } from '$databaseMusiconn/stores/storeEvents';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';

let cachedEvents: Events;
let startYear: number;
let endYear: number;
let locationInfo: LocationInfo;

export const load: PageServerLoad = async ({ params }) => {
	// if a param.mainLocationID is given the use that instead of the mainLocationID store.
	// It must be a number
	if (!params.mainLocationID || isNaN(Number(params.mainLocationID))) {
		// redirect to the main location page
		redirect(302, '/database');
	} else {
		mainLocationID.set(Number(params.mainLocationID));
	}

	if (!cachedEvents) {
		try {
			const res = await joinEventByYear();
			locationInfo = await getLocationInfo(get(mainLocationID));
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
			endYear: endYear,
			locationInfo: locationInfo
		}
	};
};
