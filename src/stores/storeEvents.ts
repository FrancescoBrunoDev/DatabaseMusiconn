import { urlBaseAPIMusiconn } from '$databaseMusiconn/states/stateGeneral.svelte';
import { filters } from '$databaseMusiconn/stores/storeFilters';
import { get, writable } from 'svelte/store';

const fetchedEvents = writable<Events>(undefined);
const allTitles = writable<allTitles>({
	work: {},
	person: {},
	location: {},
	corporation: {},
	composer: {}
});

const mainLocationInfo = writable<LocationInfo>(undefined); //307 (new 332) is the ID of Muenster in the musiconn database

const kindMapping: { [key in Entity]: { key: string; uid: string } } = {
	work: { key: 'performances', uid: 'work' },
	person: { key: 'persons', uid: 'person' },
	location: { key: 'locations', uid: 'location' },
	corporation: { key: 'corporations', uid: 'corporation' },
	composer: { key: 'composers', uid: 'person' }
};

const projectID = writable<number | null>(null);
const useBounderiesYears = writable<boolean>(false);
const startYear = writable<number>(1850);
const endYear = writable<number>(1900);
const mainLocationID = writable<number>(332); //307 (new 332) is the ID of Muenster in the musiconn database

const getTitles = async (event: EventItem) => {
	const uidTypes: Entity[] = ['work', 'person', 'location', 'corporation', 'composer'];
	try {
		await Promise.all(
			uidTypes.map(async (kind) => {
				const allUids = (await getUidsPerEntity(kind, event)).map((uid: any) => uid.toString());

				// Get the current state of allTitles store
				const currentTitles = get(allTitles)[kind] || {};

				// Filter UIDs that are not already in the store
				const missingUids = allUids.filter((uid) => {
					const numUid = Number(uid);
					return !currentTitles[numUid];
				});

				// Only fetch titles if there are missing UIDs
				if (missingUids.length > 0) {
					await getTitle(missingUids, kind);
				}
			})
		);
	} catch (error) {
		console.error(
			'An error occurred while fetching titles, I will try to use the stored Titles:',
			error
		);
	}
};

const getTitle = async (allUids: string[], kind: Entity) => {
	let kindForApi: Entity = kind;
	if (kind === 'composer') {
		kindForApi = 'person';
	}

	// Filter out UIDs that already exist in allTitles store
	const existingTitles = get(allTitles)[kind] || {};
	const uidsToFetch = allUids.filter((uid) => {
		const numUid = Number(uid);
		return !existingTitles[numUid];
	});

	// If all UIDs are already in the store, return early
	if (uidsToFetch.length === 0) {
		return;
	}

	// Process IDs in batches of 50 to avoid URL length limitations
	const batchSize = 50;
	const batches = [];

	// Split filtered UIDs into batches
	for (let i = 0; i < uidsToFetch.length; i += batchSize) {
		batches.push(uidsToFetch.slice(i, i + batchSize));
	}

	// Process all batches in parallel
	const results = await Promise.all(
		batches.map(async (batchUids) => {
			const uids = batchUids.length > 1 ? batchUids.join('|') : batchUids[0];
			const res = await fetch(
				`${urlBaseAPIMusiconn}?action=get&${kindForApi}=${uids}&props=title&format=json`
			);
			const json = await res.json();
			return json[kindForApi] || {};
		})
	);

	// Merge all batch results
	const titles = results.reduce((acc, batch) => ({ ...acc, ...batch }), {});

	// Update store with all fetched titles
	allTitles.update((allTitlesMom) => {
		allTitlesMom[kind] = { ...allTitlesMom[kind], ...titles };
		return allTitlesMom;
	});
};

const getGeometries = async (locationID: number) => {
	const res = await fetch(
		`${urlBaseAPIMusiconn}?action=get&location=${locationID}&props=geometries&format=json`
	);
	const json = await res.json();

	return json.location[locationID].geometries;
};

const getUidsPerEntity = async (kind: Entity, event: EventItem) => {
	const uids = new Set();

	const kindKey = kindMapping[kind] ? (kindMapping[kind].key as KindKey) : undefined;
	const uidKey = kindMapping[kind] ? (kindMapping[kind]?.uid as Entity) : undefined;
	if (kindKey && uidKey && event[kindKey]) {
		event[kindKey].forEach((item) => {
			uids.add(item[uidKey]);
		});
	}

	return Array.from(uids);
};

const getTitleString = (uid: number, kind: Entity): Promise<string> => {
	return new Promise((resolve, reject) => {
		// Check if the title is already available in the store
		const currentTitles = get(allTitles);
		const title = currentTitles[kind]?.[uid]?.title;
		if (title) {
			resolve(title);
			return;
		}

		// If not available, subscribe to the store and wait for the title
		const unsubscribe = allTitles.subscribe((res) => {
			const titleObj = res[kind]?.[uid];
			if (titleObj) {
				unsubscribe();
				resolve(titleObj.title);
			}
		});

		// Set a timeout to prevent hanging promises
		setTimeout(() => {
			unsubscribe();
			resolve(`Unknown ${kind} (${uid})`);
		}, 5000); // 5 second timeout
	});
};

function getCountersForEvent({ event }: { event: EventItem }) {
	const filtersMap = new Map();
	const _filters = get(filters);

	const incrementCounter = (id: number, condition: boolean) => {
		if (condition) {
			const filter = filtersMap.get(id);
			if (filter) {
				filter.counter++;
			}
		}
	};

	Object.values(_filters).forEach((methods) => {
		methods.forEach((filter) => {
			if (!filtersMap.has(filter.id)) {
				filtersMap.set(filter.id, {
					counter: 0,
					color: filter.color || ''
				});
			}

			if (!event.performances) return;

			const { entity, id } = filter;
			const filterId = Number(id);

			switch (entity) {
				case 'composer':
				case 'work':
				case 'person':
					event.performances.forEach((performance) => {
						if (entity === 'composer' && performance.composers) {
							incrementCounter(filterId, filter.id == performance.composers[0].person);
						} else if (entity === 'work') {
							incrementCounter(filterId, filter.id == performance.work);
						} else if (entity === 'person' && performance.persons) {
							performance.persons.forEach((person) => {
								incrementCounter(filterId, filter.id == person.person);
							});
						}
					});
					break;
				case 'corporation':
					if (event.corporations) {
						event.corporations.forEach((corporation) => {
							incrementCounter(filterId, filter.id == corporation.corporation);
						});
					}
					break;
			}
		});
	});

	const filtersArrayWithCounter = Object.fromEntries(filtersMap);
	return filtersArrayWithCounter;
}

function getFormattedDate({ event }: { event: EventItem }) {
	let dateStr = event?.dates[0].date;
	if (dateStr && dateStr !== '00.00') {
		// handle date format 00.00 or day undefined
		if (dateStr.endsWith('-00')) {
			let dateObj = new Date(dateStr.slice(0, -2) + '01');
			return dateObj.toLocaleDateString('it-IT', { month: '2-digit' }) + '.?';
		} else {
			let dateObj = new Date(dateStr);
			let formattedDate = dateObj.toLocaleDateString('it-IT', {
				day: '2-digit',
				month: '2-digit'
			});
			return formattedDate.split('/').join('.');
		}
	} else {
		return '?';
	}
}

export {
	allTitles,
	endYear,
	fetchedEvents,
	getCountersForEvent,
	getFormattedDate,
	getGeometries,
	getTitle,
	getTitles,
	getTitleString,
	mainLocationID,
	mainLocationInfo,
	projectID,
	startYear,
	useBounderiesYears
};
