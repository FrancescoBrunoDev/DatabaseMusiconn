import {
	getLocationInfo,
	streamEventsForLocation
} from '$databaseMusiconn/lib/dataMusiconn.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.mainLocationID);
	if (!Number.isSafeInteger(id) || id <= 0) redirect(302, '/database');

	const [locationResult, streamResult] = await Promise.allSettled([
		getLocationInfo(id),
		streamEventsForLocation(id)
	]);

	if (locationResult.status === 'rejected') {
		console.error('An error occurred while fetching location info:', locationResult.reason);
	}
	if (streamResult.status === 'rejected') {
		console.error('An error occurred while fetching event metadata:', streamResult.reason);
	}

	const streamed =
		streamResult.status === 'fulfilled'
			? streamResult.value
			: { timeline: {}, firstYear: 0, lastYear: 0, totalPages: 0, eventPages: [] };

	return {
		props: {
			events: {} as Events,
			startYear: streamed.firstYear,
			endYear: streamed.lastYear,
			locationInfo:
				locationResult.status === 'fulfilled' ? locationResult.value : ({} as LocationInfo),
			timeline: streamed.timeline,
			totalPages: streamed.totalPages,
			eventPages: streamed.eventPages
		}
	};
};
