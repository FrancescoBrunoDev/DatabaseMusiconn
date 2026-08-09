import {
	getEventPage,
	getLocationInfo as getLocationInfoGraphql,
	getLocationMeta,
	type LocationMeta
} from '$databaseMusiconn/lib/musiconnApi';
import {
	mainLocationID,
	startYear,
	endYear,
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

const MAX_STREAM_CACHE_ENTRIES = 12;

/**
 * Fast metadata + streamed per-page events for a location, cached for 1 hour.
 * Cold: starts a bounded number of page fetches and returns promises so SvelteKit
 * streams them individually. Warm: returns already-resolved arrays so the page
 * hydrates instantly.
 */
const streamInFlight = new Map<number, Promise<StreamedEvents>>();

export const streamEventsForLocation = (locationId: number): Promise<StreamedEvents> => {
	const existing = streamInFlight.get(locationId);
	if (existing) return existing;
	const request = streamEventsForLocationInternal(locationId).finally(() =>
		streamInFlight.delete(locationId)
	);
	streamInFlight.set(locationId, request);
	return request;
};

const streamEventsForLocationInternal = async (locationId: number): Promise<StreamedEvents> => {
	const now = Date.now();
	let entry = streamCache.get(locationId);
	if (entry && now - entry.timestamp <= 3600000) {
		entry.timestamp = now;
	} else {
		const meta = await getLocationMeta(locationId);
		const totalPages = Math.max(1, Math.ceil(meta.count / 100));
		const pages: (EventItem[] | Promise<EventItem[]>)[] = [];
		const deferred: {
			promise: Promise<EventItem[]>;
			resolve: (page: EventItem[]) => void;
			reject: (error: unknown) => void;
		}[] = [];

		for (let p = 1; p <= totalPages; p++) {
			let resolve!: (page: EventItem[]) => void;
			let reject!: (error: unknown) => void;
			const promise = new Promise<EventItem[]>((res, rej) => {
				resolve = res;
				reject = rej;
			});
			pages.push(promise);
			deferred.push({ promise, resolve, reject });
		}

		entry = {
			timeline: meta.timeline,
			firstYear: meta.firstYear,
			lastYear: meta.lastYear,
			totalPages,
			pages,
			timestamp: now
		};
		// Publish the entry before starting requests so simultaneous callers share it.
		streamCache.set(locationId, entry);
		while (streamCache.size > MAX_STREAM_CACHE_ENTRIES) {
			const oldest = [...streamCache.entries()].sort(
				([, a], [, b]) => a.timestamp - b.timestamp
			)[0]?.[0];
			if (oldest === undefined) break;
			streamCache.delete(oldest);
		}

		// Keep the API load bounded. Page 1 starts immediately; later pages are
		// launched in waves as earlier pages settle instead of all at once.
		const concurrency = Math.min(6, totalPages);
		let nextPage = 1;
		const fetchNextBatch = () => {
			const batch = [];
			while (nextPage <= totalPages && batch.length < concurrency) batch.push(nextPage++);
			if (batch.length === 0) return;

			Promise.all(
				batch.map(async (pageNumber) => {
					try {
						const page = await getEventPage(locationId, pageNumber);
						entry!.pages[pageNumber - 1] = page;
						deferred[pageNumber - 1].resolve(page);
					} catch (error) {
						// Preserve the failure so the UI can report an incomplete load;
						// never turn a failed page into an apparently valid empty page.
						if (streamCache.get(locationId) === entry) streamCache.delete(locationId);
						deferred[pageNumber - 1].reject(error);
					}
				})
			).finally(fetchNextBatch);
		};
		fetchNextBatch();
	}
	return {
		timeline: entry.timeline,
		firstYear: entry.firstYear,
		lastYear: entry.lastYear,
		totalPages: entry.totalPages,
		eventPages: entry.pages
	};
};
