import { browser } from '$app/environment';
import { urlBaseAPIMusiconn } from '$databaseMusiconn/states/stateGeneral.svelte';
import { filters } from '$databaseMusiconn/stores/storeFilters';
import { get, writable } from 'svelte/store';

const fetchedEvents = writable<Events>(undefined);
// Create a more efficient cache with loading states
const allTitles = writable<allTitles>({
	work: {},
	person: {},
	location: {},
	corporation: {},
	composer: {}
});

// Track which UIDs are currently being fetched to avoid duplicate requests
const loadingTitles = new Map<string, Set<number>>();

// Track failed fetches to avoid retrying immediately
const failedTitles = new Map<string, Set<number>>();

// Local storage key for caching
const CACHE_KEY = 'musiconn_titles_cache';
const CACHE_VERSION = '1.0';
const CACHE_EXPIRY_HOURS = 24;

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

	// Filter out UIDs that already exist or are currently loading
	const existingTitles = get(allTitles)[kind] || {};
	const currentlyLoading = loadingTitles.get(kind) || new Set();
	const failed = failedTitles.get(kind) || new Set();

	const uidsToFetch = allUids.filter((uid) => {
		const numUid = Number(uid);
		return !existingTitles[numUid] && !currentlyLoading.has(numUid) && !failed.has(numUid);
	});

	// If all UIDs are already in the store or loading, return early
	if (uidsToFetch.length === 0) {
		return;
	}

	// Mark UIDs as loading
	const loadingSet = loadingTitles.get(kind) || new Set();
	uidsToFetch.forEach((uid) => loadingSet.add(Number(uid)));
	loadingTitles.set(kind, loadingSet);

	try {
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

				if (!res.ok) {
					throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				}

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
	} catch (error) {
		console.error(`Failed to fetch titles for ${kind}:`, error);

		// Mark failed UIDs to avoid immediate retry
		const failedSet = failedTitles.get(kind) || new Set();
		uidsToFetch.forEach((uid) => failedSet.add(Number(uid)));
		failedTitles.set(kind, failedSet);

		// Clear failed cache after 5 minutes
		setTimeout(
			() => {
				failedTitles.delete(kind);
			},
			5 * 60 * 1000
		);
	} finally {
		// Remove UIDs from loading set
		const loadingSet = loadingTitles.get(kind) || new Set();
		uidsToFetch.forEach((uid) => loadingSet.delete(Number(uid)));
		if (loadingSet.size === 0) {
			loadingTitles.delete(kind);
		} else {
			loadingTitles.set(kind, loadingSet);
		}
	}
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

// Optimized synchronous version that returns cached data or triggers fetch
const getTitleString = (uid: number, kind: Entity): string | undefined => {
	const currentTitles = get(allTitles);
	const title = currentTitles[kind]?.[uid]?.title;

	if (title) {
		return title;
	}

	// If not cached, trigger background fetch and return placeholder
	const loadingSet = loadingTitles.get(kind) || new Set();
	const failedSet = failedTitles.get(kind) || new Set();

	if (!loadingSet.has(uid) && !failedSet.has(uid)) {
		// Trigger background fetch
		getTitle([uid.toString()], kind).catch((error) => {
			console.error(`Failed to fetch title for ${kind} ${uid}:`, error);
		});
	}

	return undefined; // Return undefined if title is not available yet
};

// Async version that waits for the data
const getTitleStringAsync = (uid: number, kind: Entity): Promise<string> => {
	return new Promise((resolve) => {
		// Check if the title is already available in the store
		const currentTitles = get(allTitles);
		const title = currentTitles[kind]?.[uid]?.title;
		if (title) {
			resolve(title);
			return;
		}

		// If not available, trigger fetch and wait
		const loadingSet = loadingTitles.get(kind) || new Set();
		const failedSet = failedTitles.get(kind) || new Set();

		if (!loadingSet.has(uid) && !failedSet.has(uid)) {
			getTitle([uid.toString()], kind);
		}

		// Subscribe to the store and wait for the title
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
		}, 10000); // Increased timeout to 10 seconds
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

// Initialize cache from localStorage
const initializeCache = () => {
	// Check if we're in the browser (not SSR)
	if (!browser) {
		return;
	}

	try {
		const cached = localStorage.getItem(CACHE_KEY);
		if (cached) {
			const { data, timestamp, version } = JSON.parse(cached);
			const now = Date.now();
			const isExpired = now - timestamp > CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

			if (!isExpired && version === CACHE_VERSION && data) {
				allTitles.set(data);
			}
		}
	} catch (error) {
		console.warn('Failed to load cache from localStorage:', error);
	}
};

// Save cache to localStorage
const saveCache = () => {
	// Check if we're in the browser (not SSR)
	if (!browser) {
		return;
	}

	try {
		const data = get(allTitles);
		const cacheObject = {
			data,
			timestamp: Date.now(),
			version: CACHE_VERSION
		};
		localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
	} catch (error) {
		console.warn('Failed to save cache to localStorage:', error);
	}
};

// Subscribe to allTitles changes and save to localStorage
allTitles.subscribe(() => {
	saveCache();
});

// Initialize cache on module load (only in browser)
if (browser) {
	initializeCache();
}

// Preload titles for multiple events efficiently
const preloadTitlesForEvents = async (events: EventItem[]) => {
	const allUidsToFetch: { [K in Entity]: Set<number> } = {
		work: new Set(),
		person: new Set(),
		location: new Set(),
		corporation: new Set(),
		composer: new Set()
	};

	// Collect all unique UIDs from all events
	events.forEach((event) => {
		const uidTypes: Entity[] = ['work', 'person', 'location', 'corporation', 'composer'];
		uidTypes.forEach(async (kind) => {
			const uids = await getUidsPerEntity(kind, event);
			uids.forEach((uid) => allUidsToFetch[kind].add(Number(uid)));
		});
	});

	// Fetch titles for all collected UIDs in parallel
	const fetchPromises = Object.entries(allUidsToFetch).map(([kind, uidsSet]) => {
		if (uidsSet.size > 0) {
			const uidsArray = Array.from(uidsSet).map((uid) => uid.toString());
			return getTitle(uidsArray, kind as Entity);
		}
		return Promise.resolve();
	});

	try {
		await Promise.all(fetchPromises);
		console.log('Preloaded titles for', events.length, 'events');
	} catch (error) {
		console.error('Error preloading titles:', error);
	}
};

// Prioritized title fetching - fetches titles for high-count items first
const getTitlesPrioritized = async (items: Array<{ id: string; count: number }>, kind: Entity) => {
	if (!items.length) return;

	// Sort items by count (highest first) and extract IDs
	const sortedItems = [...items].sort((a, b) => b.count - a.count);
	const existingTitles = get(allTitles)[kind] || {};
	const loadingSet = loadingTitles.get(kind) || new Set();
	const failed = failedTitles.get(kind) || new Set();

	// Filter out UIDs that already exist, are loading, or have failed
	const uidsToFetch = sortedItems
		.map((item) => ({ uid: item.id, count: item.count }))
		.filter(({ uid }) => {
			const numUid = Number(uid);
			return !existingTitles[numUid] && !loadingSet.has(numUid) && !failed.has(numUid);
		});

	if (uidsToFetch.length === 0) return;

	// More aggressive prioritization - fetch highest count items individually first
	const highPriority = uidsToFetch.slice(0, 10); // Top 10 items individually
	const normalPriority = uidsToFetch.slice(10); // Rest in small batches

	try {
		// Fetch top 10 items one by one for maximum priority
		for (const item of highPriority) {
			try {
				await getTitle([item.uid], kind);
				// Very small delay to allow UI update
				await new Promise((resolve) => setTimeout(resolve, 5));
			} catch (error) {
				console.error(`Failed to fetch high-priority title ${item.uid} for ${kind}:`, error);
			}
		}

		// Process remaining items in small batches
		const batchSize = 10;
		for (let i = 0; i < normalPriority.length; i += batchSize) {
			const batch = normalPriority.slice(i, i + batchSize);
			try {
				const uids = batch.map((item) => item.uid);
				await getTitle(uids, kind);

				// Small delay between batches
				await new Promise((resolve) => setTimeout(resolve, 20));
			} catch (error) {
				console.error(`Failed to fetch batch for ${kind}:`, error);
			}
		}
	} catch (error) {
		console.error(`Failed to fetch prioritized titles for ${kind}:`, error);
	}
};

// Clear failed cache (useful for retry mechanisms)
const clearFailedCache = () => {
	failedTitles.clear();
	console.log('Cleared failed titles cache');
};

// Get cache statistics
const getCacheStats = () => {
	const titles = get(allTitles);
	const stats = {
		totalCached: 0,
		byEntity: {} as { [K in Entity]: number },
		loading: Object.fromEntries(loadingTitles),
		failed: Object.fromEntries(failedTitles)
	};

	Object.entries(titles).forEach(([entity, entityTitles]) => {
		const count = Object.keys(entityTitles).length;
		stats.byEntity[entity as Entity] = count;
		stats.totalCached += count;
	});

	return stats;
};

export {
	allTitles,
	clearFailedCache,
	endYear,
	fetchedEvents,
	getCacheStats,
	getCountersForEvent,
	getFormattedDate,
	getGeometries,
	getTitle,
	getTitles,
	getTitlesPrioritized,
	getTitleString,
	getTitleStringAsync,
	mainLocationID,
	mainLocationInfo,
	preloadTitlesForEvents,
	projectID,
	startYear,
	useBounderiesYears
};
