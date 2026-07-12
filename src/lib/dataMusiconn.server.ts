import {
	getEventPage,
	getLocationInfo as getLocationInfoGraphql,
	getLocationMeta,
	type LocationMeta
} from '$databaseMusiconn/lib/musiconnApi';
import { mainLocationID, startYear, endYear, useBounderiesYears } from '$databaseMusiconn/stores/storeEvents';
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

/**
 * Legacy entry point that fetches ALL events for the current main location and
 * groups them by year into the legacy `Events` shape. Kept for callers that need
 * the full dataset synchronously after a single awaited call (e.g. the filtered
 * share-link route).
 */
export const joinEventByYear = async () => {
	let _mainLocationID: number = get(mainLocationID);
	const meta = await getLocationMeta(_mainLocationID);

	if (!get(useBounderiesYears)) {
		startYear.update(() => meta.firstYear ?? 0);
		endYear.update(() => meta.lastYear ?? 0);
	}

	const allEvents: EventItem[] = [];
	for (let p = 1; p <= Math.max(1, Math.ceil(meta.count / 100)); p++) {
		try {
			const page = await getEventPage(_mainLocationID, p);
			allEvents.push(...page);
		} catch (error) {
			console.error('Error fetching event page:', error);
		}
	}

	const eventsByYear: Events = {};
	const startYearValue = get(startYear);
	const endYearValue = get(endYear);
	for (const event of allEvents) {
		if (!event?.dates?.[0]?.date) continue;
		const year = event.dates[0].date.split('-')[0];
		if (year < startYearValue || year > endYearValue) continue;
		(eventsByYear[year] = eventsByYear[year] || []).push(event);
	}

	return { event: eventsByYear, startYear: startYearValue, endYear: endYearValue };
};

/* ------------------------------------------------------------------ */
/* Streaming: ship fast metadata + per-page promises so the UI can    */
/* show a real progress bar and fill the event list progressively.    */
/* ------------------------------------------------------------------ */

export interface StreamedEvents {
	timeline: { [year: string]: number };
	firstYear: number;
	lastYear: number;
	totalPages: number;
	/** Each entry resolves to one page of reshaped `EventItem`s. On a cache hit
	 * these are already-resolved arrays; on a miss they are in-flight promises
	 * that stream individually to the browser. */
	eventPages: (EventItem[] | Promise<EventItem[]>)[];
}

const streamCache = new Map<
	number,
	{
		timeline: { [year: string]: number };
		firstYear: number;
		lastYear: number;
		totalPages: number;
		pages: (EventItem[] | Promise<EventItem[]>)[];
		timestamp: number;
	}
>();

/**
 * Fast metadata + streamed per-page events for a location, cached for 1 hour.
 * Cold: kicks off all page fetches concurrently and returns their promises so
 * SvelteKit streams them individually. Warm: returns already-resolved arrays so
 * the page hydrates instantly.
 */
export const streamEventsForLocation = async (
	locationId: number
): Promise<StreamedEvents> => {
	const now = Date.now();
	let entry = streamCache.get(locationId);
	if (!entry || now - entry.timestamp > 3600000) {
		const meta = await getLocationMeta(locationId);
		const totalPages = Math.max(1, Math.ceil(meta.count / 100));
		const pages: (EventItem[] | Promise<EventItem[]>)[] = [];
		entry = {
			timeline: meta.timeline,
			firstYear: meta.firstYear,
			lastYear: meta.lastYear,
			totalPages,
			pages,
			timestamp: now
		};
		for (let p = 1; p <= totalPages; p++) {
			const promise = getEventPage(locationId, p).then((page) => {
				// Swap the promise for the resolved page in the cache so subsequent
				// requests hydrate instantly.
				if (entry) entry.pages[p - 1] = page;
				return page;
			}).catch(() => [] as EventItem[]);
			pages.push(promise);
		}
		streamCache.set(locationId, entry);
	}
	return {
		timeline: entry.timeline,
		firstYear: entry.firstYear,
		lastYear: entry.lastYear,
		totalPages: entry.totalPages,
		eventPages: entry.pages
	};
};