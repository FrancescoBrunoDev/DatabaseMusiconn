import {
	getEventsForLocation,
	getLocationInfo as getLocationInfoGraphql
} from '$databaseMusiconn/lib/musiconnApi';
import {
	endYear,
	mainLocationID,
	startYear,
	useBounderiesYears
} from '$databaseMusiconn/stores/storeEvents';
import { get } from 'svelte/store';

/**
 * Get the main location info (legacy `LocationInfo` shape).
 *
 * @param mainLocationID
 * @returns Promise<LocationInfo>
 */
export async function getLocationInfo(mainLocationID: number): Promise<LocationInfo> {
	try {
		return await getLocationInfoGraphql(mainLocationID);
	} catch (error) {
		console.error('Error fetching location info:', error);
		throw error;
	}
}

const findfirstAndLastYear = ({ allEvents }: { allEvents: EventItem[] }) => {
	let firstYear: number | null = null;
	let lastYear: number | null = null;
	for (const event of allEvents) {
		if (event?.dates?.[0]?.date) {
			const year = parseInt(event.dates[0].date.split('-')[0]);
			if (Number.isNaN(year)) continue;
			if (firstYear === null || year < firstYear) firstYear = year;
			if (lastYear === null || year > lastYear) lastYear = year;
		}
	}
	startYear.update(() => firstYear ?? 0);
	endYear.update(() => lastYear ?? 0);
	return { firstYear, lastYear };
};

/**
 * Fetch all events for the current main location (recursively, including child
 * locations) from the new GraphQL API, then group them by year into the legacy
 * `Events` shape used throughout the app.
 */
const joinEventByYear = async () => {
	let _mainLocationID: number = get(mainLocationID);
	const allEvents = await getEventsForLocation(_mainLocationID);

	if (!get(useBounderiesYears)) {
		findfirstAndLastYear({ allEvents });
	}

	const eventsByYear: Events = {};
	const startYearValue = get(startYear);
	const endYearValue = get(endYear);

	for (const event of allEvents) {
		if (!event?.dates?.[0]?.date) continue;
		const year = event.dates[0].date.split('-')[0];

		// Events outside the configured year range are ignored.
		if (year < startYearValue || year > endYearValue) continue;

		if (eventsByYear[year]) {
			eventsByYear[year].push(event);
		} else {
			eventsByYear[year] = [event];
		}
	}

	return { event: eventsByYear, startYear: startYearValue, endYear: endYearValue };
};

export { joinEventByYear };