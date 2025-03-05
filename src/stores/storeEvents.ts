import { urlBaseAPIMusiconn } from '$states/stateGeneral.svelte';
import { filters } from '$stores/storeFilters';
import { get, writable } from 'svelte/store';

const fetchedEvents = writable<Events>(undefined);
const allTitles = writable<allTitles>({
	work: {},
	person: {},
	location: {},
	corporation: {},
	composer: {}
});

const kindMapping: { [key in Entity]: { key: string; uid: string } } = {
	work: { key: 'performances', uid: 'work' },
	person: { key: 'persons', uid: 'person' },
	location: { key: 'locations', uid: 'location' },
	corporation: { key: 'corporations', uid: 'corporation' },
	composer: { key: 'composers', uid: 'person' }
};

const projectID = writable<number>(26);
const startYear = writable<number>(1850);
const endYear = writable<number>(1900);
const mainLocationID = writable<number>(332); //307 (new 332) is the ID of Muenster in the musiconn database

const getTitles = async (event: EventItem) => {
	const uidTypes: Entity[] = ['work', 'person', 'location', 'corporation', 'composer'];
	try {
		await Promise.all(
			uidTypes.map(async (kind) => {
				const allUids = (await getUidsPerEntity(kind, event)).map((uid: any) => uid.toString());
				let titlesAlreadyPresent = true;
				allTitles.subscribe((allTitlesMom) => {
					const titles = allUids
						.map((uid: any) => allTitlesMom[kind][uid])
						.filter((title) => title);
					if (titles.length !== allUids.length) {
						titlesAlreadyPresent = false;
					}
				});
				if (!titlesAlreadyPresent) {
					getTitle(allUids, kind);
				}
			})
		);
	} catch (error) {
		console.error('An error occurred while fetching titles, I will try to use the stored Titles:');
	}
};

const getTitle = async (allUids: string[], kind: Entity) => {
	let kindForApi: Entity = kind;
	if (kind === 'composer') {
		kindForApi = 'person';
	}
	const uids = allUids.length > 1 ? allUids.join('|') : allUids[0];
	const res = await fetch(
		`${urlBaseAPIMusiconn}?action=get&${kindForApi}=${uids}&props=title&format=json`
	);
	const json = await res.json();
	const titles = json[kindForApi];
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
		let _allTitles: allTitles = {
			work: {},
			person: {},
			location: {},
			corporation: {},
			composer: {}
		};
		const intervalId = setInterval(() => {
			allTitles.subscribe((res) => {
				_allTitles = res;
				const titles = _allTitles[kind];
				const titleObj = titles[uid];
				if (titleObj) {
					clearInterval(intervalId);
					resolve(titleObj.title);
				}
			});
		}, 10); // Check every second
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
	projectID,
	startYear
};
