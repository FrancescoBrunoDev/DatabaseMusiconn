import { urlBaseAPIMusiconn } from '$states/stateGeneral.svelte';
import { endYear, mainLocationID, startYear } from '$stores/storeEvents';
import { get } from 'svelte/store';

const getLocationEventsAndChildLocation = async (locationId: number) => {
	try {
		const res = await fetch(
			`${urlBaseAPIMusiconn}?action=get&location=${locationId}&props=childs|events&format=json`
		);
		const data = await res.json();
		let events = data.location[locationId].events || [];

		if (data.location[locationId].childs && data.location[locationId].childs.length > 0) {
			const childEventsPromises = data.location[locationId].childs.map((child: any) =>
				getLocationEventsAndChildLocation(child.location)
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
			const res = await fetch(
				`${urlBaseAPIMusiconn}?action=get&event=${joinedEventIds}&props=uid|dates|locations|persons|performances|corporations|sources&format=json`
			);
			return res.json();
		});

		const jsons = await Promise.all(fetchPromises);
		return jsons;
	} catch (error) {
		console.error('Error fetching all events:', error);
		return [];
	}
};

const joinEventByYear = async () => {
	const allEvents = await getAllEvents();
	const eventsByYear: Events = {};
	for (const batch of allEvents) {
		const allEvents = batch.event;
		for (const key in allEvents) {
			const event = allEvents[key];
			let startYearValue: number = get(startYear);
			let endYearValue: number = get(endYear);
			// se la data è antecedente al 1850 o successiva la 1900 non la considero
			if (
				event.dates[0].date.split('-')[0] < startYearValue ||
				event.dates[0].date.split('-')[0] > endYearValue
			) {
				continue;
			}
			const year = event.dates[0].date.split('-')[0];

			if (eventsByYear[year]) {
				eventsByYear[year].push(event);
			} else {
				eventsByYear[year] = [event];
			}
		}
	}

	return eventsByYear;
};

export { joinEventByYear };
