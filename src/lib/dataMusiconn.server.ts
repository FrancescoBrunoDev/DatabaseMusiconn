import { urlBaseAPIMusiconn } from '$databaseMusiconn/states/stateGeneral.svelte';
import {
	endYear,
	mainLocationID,
	startYear,
	useBounderiesYears
} from '$databaseMusiconn/stores/storeEvents';
import { get } from 'svelte/store';

/**
 * Funzione che implementa la logica di retry per le fetch
 */
const fetchWithRetry = async (url: string, retries = 3, delay = 1000, timeout = 30000) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		for (let i = 0; i < retries; i++) {
			try {
				const response = await fetch(url, { signal: controller.signal });
				if (response.ok) {
					return await response.json();
				}
			} catch (error) {
				console.warn(`Attempt ${i + 1} failed for ${url}. Retrying...`);
				if (i === retries - 1) throw error;
				// Delay before retry
				await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
			}
		}
		throw new Error(`Failed after ${retries} retries`);
	} finally {
		clearTimeout(timeoutId);
	}
};

/**
 * Get the main location infos
 *
 * @param mainLocationID
 * @returns Promise<LocationInfo>
 */
export async function getLocationInfo(mainLocationID: number): Promise<LocationInfo> {
	try {
		const response = await fetchWithRetry(
			`${urlBaseAPIMusiconn}?action=get&location=${mainLocationID}&props=uid|title|slug|categories|geometries|childs|parents&format=json`
		);
		return response.location[mainLocationID];
	} catch (error) {
		console.error('Error fetching location info:', error);
		throw error;
	}
}

/**
 * Delay per evitare di sovraccaricare l'API
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getLocationEventsAndChildLocation = async (locationId: number, depth = 0) => {
	try {
		// Introduciamo un ritardo proporzionale alla profondità per evitare troppe richieste simultanee
		// await delay(Math.min(depth * 200, 1000));
		const data = await fetchWithRetry(
			`${urlBaseAPIMusiconn}?action=get&location=${locationId}&props=childs|events&format=json`
		);
		let events = data.location[locationId].events || [];

		if (data.location[locationId].childs && data.location[locationId].childs.length > 0) {
			const childEventsPromises = data.location[locationId].childs.map((child: any) =>
				getLocationEventsAndChildLocation(child.location, depth + 1)
			);
			const childEvents = await Promise.all(childEventsPromises);
			events = events.concat(...childEvents);
		}

		return events;
	} catch (error) {
		console.error('Error fetching events and child locations:', error);
		return [];
	}
};

const getAllEvents = async () => {
	try {
		let _mainLocationID: number = get(mainLocationID);
		const allEventIds = await getLocationEventsAndChildLocation(_mainLocationID);

		const batchSize = 300;

		// Split the event IDs into batches of size batchSize
		const batches = Array.from({ length: Math.ceil(allEventIds.length / batchSize) }, (_, i) =>
			allEventIds.slice(i * batchSize, i * batchSize + batchSize)
		);

		const fetchPromises = batches.map(async (batch: { event: string }[]) => {
			const joinedEventIds = batch.map((eventObj) => eventObj.event).join('|');
			const data = await fetchWithRetry(
				`${urlBaseAPIMusiconn}?action=get&event=${joinedEventIds}&props=uid|dates|locations|persons|performances|corporations|sources&format=json`
			);
			return data;
		});

		const jsons = await Promise.all(fetchPromises);
		return jsons;
	} catch (error) {
		console.error('Error fetching all events:', error);
		return [];
	}
};

const findfirstAndLastYear = async ({ allEvents }: { allEvents: any[] }) => {
	let firstYear: number | null = null;
	// last year default value is today year
	let lastYear: number | null = null;
	for (const batch of allEvents) {
		const allEvents = batch.event;
		for (const key in allEvents) {
			const event = allEvents[key];
			if (event && event.dates && event.dates[0] && event.dates[0].date) {
				let year = event.dates[0].date.split('-')[0];
				const yearNum = parseInt(year);
				if (firstYear === null || yearNum < firstYear) {
					firstYear = yearNum;
				}
				if (lastYear === null || yearNum > lastYear) {
					lastYear = yearNum;
				}
			}
		}
	}
	startYear.update(() => firstYear ?? 0);
	endYear.update(() => lastYear ?? 0);
	return { firstYear, lastYear };
};

const joinEventByYear = async () => {
	const allEvents = await getAllEvents();
	if (!get(useBounderiesYears)) {
		await findfirstAndLastYear({ allEvents });
	}
	const eventsByYear: Events = {};

	// Get values from stores or use firstYear/lastYear if they're null
	let startYearValue = get(startYear);
	let endYearValue = get(endYear);

	for (const batch of allEvents) {
		const allEvents = batch.event;
		for (const key in allEvents) {
			const event = allEvents[key];
			if (!event?.dates?.[0]?.date) continue;

			const year = event.dates[0].date.split('-')[0];

			// se la data è antecedente a startYearValue o successiva a endYearValue non la considero
			if (year < startYearValue || year > endYearValue) {
				continue;
			}

			if (eventsByYear[year]) {
				eventsByYear[year].push(event);
			} else {
				eventsByYear[year] = [event];
			}
		}
	}

	return { event: eventsByYear, startYear: startYearValue, endYear: endYearValue };
};

export { joinEventByYear };
