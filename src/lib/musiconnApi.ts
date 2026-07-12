/**
 * GraphQL client + adapters for the new musiconn performance API.
 *
 * The old REST-style API (`https://performance.musiconn.de/api?action=...`) is gone
 * and has been replaced by a Strawberry GraphQL endpoint at
 * `https://edit.performance.musiconn.de/musiconn/api`.
 *
 * This module exposes the same operations the rest of the app used to perform against
 * the old API, but talks to GraphQL and reshapes the responses back into the legacy
 * frontend types (`EventItem`, `LocationInfo`, `allTitles`, ...) so the stores and
 * components do not need to change.
 *
 * Relevant schema notes (see `ambient.d.ts` for the legacy types):
 *  - Events for a location (including its children, recursively) are fetched via
 *    `eventList(filters:"locationId:<id>")` paginated in pages of 100, sorted by date.
 *  - Batch "get title by id" is done by aliasing several single-entity queries
 *    (`person`/`work`/`location`/`corporation`) in a single GraphQL request.
 *  - Event counts for an entity use `events(personId|corporationId|workId|locationId|...){ count }`.
 *  - Work composers are the work's `involvedPersons` whose subject is "Komposition (Musik)" (id 996).
 *  - There is NO server-side name search; the `*List` `filters` argument is non-functional for
 *    persons/works/locations/corporations. Autocomplete is therefore implemented as a one-time
 *    client preload of every entity list (sorted by TITLE_ASC, 100 per page) cached in IndexedDB,
 *    with case-insensitive prefix filtering.
 */
import { browser } from '$app/environment';

/** New GraphQL endpoint. */
export const MUSICONN_API_URL = 'https://edit.performance.musiconn.de/musiconn/api';

/** GraphQL subject id for "Komposition (Musik)" used to detect work composers. */
const COMPOSITION_SUBJECT_ID = 996;

/** Maximum page size enforced by the API (higher values are silently capped). */
const PAGE_SIZE = 100;

/** Small id used to namespace persisted autocomplete data inside IndexedDB. */
const AUTOCOMPLETE_DB = 'musiconn-autocomplete';
const AUTOCOMPLETE_STORE = 'entries';
const AUTOCOMPLETE_VERSION_KEY = 'musiconn-autocomplete-version';
const AUTOCOMPLETE_VERSION = '2';

/** Determine whether a subject marks a person as a composer. */
function isCompositionSubject(subject: { id?: number; title?: string } | undefined | null): boolean {
	if (!subject) return false;
	if (subject.id === COMPOSITION_SUBJECT_ID) return true;
	return (subject.title || '').toLowerCase().includes('komposition');
}

/**
 * The new DB renumbered location categories, but the i18n dictionaries are still keyed by the
 * legacy numeric codes (1 Ort, 3 Land, 5 Stadt/Gemeinde, 7 Veranstaltungsort/Gebäude, 8 Raum/Bühne).
 * Translate a new German category label back into its legacy code so `MainLocationInfo` keeps
 * showing the localized category name.
 */
function categoryLabelToLegacyCode(label: string | null | undefined): number {
	const l = (label || '').toLowerCase();
	if (!l || l === 'allgemein') return 2;
	if (l.includes('bühne') || l.includes('raum')) return 8;
	if (l.includes('gebäude') || l.includes('veranstaltungsort')) return 7;
	if (l.includes('stadt') || l.includes('gemeinde')) return 5;
	if (l.includes('staat') || l.includes('land') || l.includes('kontinent')) return 3;
	return 1;
}

/** Turn an event `date` Int (YYYYMMDD, e.g. 18791217 or 17640200) into "YYYY-MM-DD". */
function intDateToISO(dateInt: number | null | undefined, fallback?: string | null): string {
	if (dateInt && !Number.isNaN(dateInt)) {
		const s = String(dateInt).padStart(8, '0');
		return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	}
	// Fall back to year/month/day fields; missing parts become "00" so the existing
	// `getFormattedDate` logic (which special-cases "-00" suffixes) keeps working.
	const year = (fallback || '').slice(0, 4);
	if (year) {
		return `${year}-00-00`;
	}
	return '0000-00-00';
}

/**
 * Execute a GraphQL query with a timeout and a couple of retries.
 * Throws on non-2xx responses or GraphQL errors.
 */
export async function gql<T = any>(
	query: string,
	variables?: Record<string, unknown>,
	retries = 3,
	timeoutMs = 30000
): Promise<T> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		let lastError: unknown;
		for (let attempt = 0; attempt < retries; attempt++) {
			try {
				const res = await fetch(MUSICONN_API_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ query, variables }),
					signal: controller.signal
				});
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				}
				const json = await res.json();
				if (json.errors && json.errors.length) {
					throw new Error(
						`GraphQL: ${json.errors
							.map((e: any) => (typeof e === 'string' ? e : e.message))
							.join('; ')}`
					);
				}
				return json.data as T;
			} catch (error) {
				lastError = error;
				if (attempt < retries - 1) {
					await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
				}
			}
		}
		throw lastError instanceof Error ? lastError : new Error('GraphQL request failed');
	} finally {
		clearTimeout(timeoutId);
	}
}

/** Selection set shared by every event fetch (resolving a legacy `EventItem`). */
// Trimmed to the minimum fields the legacy `EventItem` resharper needs: titles are fetched
// separately via `getTitlesByIds`, and composer detection only needs the subject id (996).
const EVENT_SELECTION = `
	id date dateYear
	location { id }
	involvedPersons { person { id } subjects { id } order }
	performances {
		order
		work { id involvedPersons { person { id } subjects { id } order } }
		involvedPersons { person { id } subjects { id } order }
		involvedCorporations { corporation { id } subjects { id } order }
	}
	involvedCorporations { corporation { id } subjects { id } order }
	sources { source { id } citations { page url } }
`;

/** Response of an `eventList` page for the shape we request. */
type RawEvent = {
	id: number;
	date: number | null;
	dateYear: string | null;
	location: { id: number };
	involvedPersons: { person: { id: number }; subjects: { id: number; title?: string }[]; order: number }[];
	performances: {
		order: number;
		work: {
			id: number;
			involvedPersons: { person: { id: number }; subjects: { id: number; title?: string }[]; order: number }[];
		};
		involvedPersons: { person: { id: number }; subjects: { id: number; title?: string }[]; order: number }[];
		involvedCorporations: { corporation: { id: number }; subjects: { id: number; title?: string }[]; order: number }[];
	}[];
	involvedCorporations: { corporation: { id: number }; subjects: { id: number; title?: string }[]; order: number }[];
	sources: { source: { id: number }; citations: { page: string | null; url: string | null }[] }[];
};

/** Reshape a raw GraphQL event into the legacy `EventItem` type. */
function reshapeEvent(ev: RawEvent): EventItem {
	const persons = (ev.involvedPersons || []).map((ip) => ({
		person: ip.person?.id,
		subject: ip.subjects?.[0]?.id,
		order: ip.order
	}));

	const performances = (ev.performances || []).map((p) => ({
		work: p.work?.id,
		order: p.order,
		composers: (p.work?.involvedPersons || [])
			.filter((wip) => (wip.subjects || []).some(isCompositionSubject))
			.map((wip) => ({ person: wip.person?.id })),
		persons: (p.involvedPersons || []).map((ip) => ({
			person: ip.person?.id,
			subject: ip.subjects?.[0]?.id,
			order: ip.order
		}))
	}));

	const corporations = (ev.involvedCorporations || []).map((c) => ({
		corporation: c.corporation?.id,
		subject: c.subjects?.[0]?.id,
		order: c.order
	}));

	// Flatten source citations: every citation becomes a legacy `Source` entry so that
	// each linked scan keeps its own `url` (the UI uses `source.url`).
	const sources: Source[] = [];
	for (const s of ev.sources || []) {
		for (const c of s.citations || [{}]) {
			sources.push({
				source: s.source?.id,
				page: (c as any)?.page ?? undefined,
				url: (c as any)?.url ?? undefined
			});
		}
	}

	return {
		uid: ev.id,
		locations: ev.location ? [{ location: ev.location.id }] : [],
		dates: [{ date: intDateToISO(ev.date, ev.dateYear || undefined) }],
		persons,
		performances,
		corporations,
		sources
	};
}

/**
 * Fetch all events for a location (recursively, including child locations),
 * already reshaped into the legacy `EventItem` type.
 */
/** Fetch a single reshaped page of events (100 items). Used to stream events
 * page-by-page so the UI can show real progress and progressively fill the
 * event list while later pages are still loading.
 */
export async function getEventPage(
	locationId: number,
	page: number,
	pageSize: number = PAGE_SIZE
): Promise<EventItem[]> {
	const data = await gql<{ eventList: { list: RawEvent[] } }>(
		`query ($page: PositiveInt, $size: PositiveInt) {
			eventList(page: $page, pageSize: $size, sort: DATE_ASC, filters: "locationId:${locationId}") {
				list { ${EVENT_SELECTION} }
			}
		}`,
		{ page, size: pageSize },
		3,
		60000
	);
	return (data.eventList?.list || []).map(reshapeEvent);
}

export async function getEventsForLocation(locationId: number): Promise<EventItem[]> {
	const fetchPage = async (page: number) => {
		const data = await gql<{ eventList: { list: RawEvent[]; pageInfo: { totalPages: number } } }>(
			`query ($page: PositiveInt, $size: PositiveInt) {
				eventList(page: $page, pageSize: $size, sort: DATE_ASC, filters: "locationId:${locationId}") {
					list { ${EVENT_SELECTION} }
					pageInfo { totalPages }
				}
			}`,
			{ page, size: PAGE_SIZE },
			3,
			60000
		);
		return data.eventList;
	};

	// Fetch the first page to learn the total page count, then fetch the remaining
	// pages concurrently. Each page request resolves its own slice of events in order
	// so the final array stays sorted by date.
	const first = await fetchPage(1);
	const totalPages = Math.min(first?.pageInfo?.totalPages ?? 1, 10000);
	if (totalPages <= 1) {
		return (first?.list || []).map(reshapeEvent);
	}

	const pages: { page: number; list: RawEvent[] }[] = [{ page: 1, list: first?.list || [] }];
	const remaining: number[] = [];
	for (let p = 2; p <= totalPages; p++) remaining.push(p);

	// The GraphQL server partially serializes concurrent requests, but firing all pages
	// at once is still faster than waiting sequentially. Bound the wave to avoid
	// tripping aggressive rate limits on very large locations.
	const concurrency = Math.min(12, remaining.length);
	for (let i = 0; i < remaining.length; i += concurrency) {
		const batch = remaining.slice(i, i + concurrency);
		const results = await Promise.all(batch.map((p) => fetchPage(p).catch(() => null)));
		results.forEach((res, idx) => {
			pages.push({ page: batch[idx], list: res?.list || [] });
		});
	}

	// Reassemble in page order to preserve DATE_ASC sorting.
	pages.sort((a, b) => a.page - b.page);
	const all: EventItem[] = [];
	for (const { list } of pages) for (const ev of list) all.push(reshapeEvent(ev));
	return all;
}

/** Legacy `LocationInfo` reshaped from a `location` GraphQL object. */
/**
 * Fast location metadata: total event count, first/last event year and the
 * per-year event histogram (the `timeline`). Used to render the line graph
 * instantly while the detailed event list streams in.
 *
 * The histogram values sum to `count`, so it is a complete per-year breakdown
 * (the same data the line graph would build from the full event list when no
 * filters are active).
 */
export interface LocationMeta {
	count: number;
	firstYear: number;
	lastYear: number;
	timeline: { [year: string]: number };
}

export async function getLocationMeta(locationId: number): Promise<LocationMeta> {
	const data = await gql<{ events: { count: number; calendar: { meta: { firstYear: number; lastYear: number } }; timeline: { [year: string]: number } } }>(
		`query ($id: PositiveInt) { events(locationId: $id) { count calendar { meta { firstYear lastYear } } timeline } }`,
		{ id: locationId }
	);
	const e = data.events || { count: 0, calendar: { meta: { firstYear: 0, lastYear: 0 } }, timeline: {} };
	return {
		count: e.count ?? 0,
		firstYear: e.calendar?.meta?.firstYear ?? 0,
		lastYear: e.calendar?.meta?.lastYear ?? 0,
		timeline: e.timeline || {}
	};
}

export async function getLocationInfo(id: number): Promise<LocationInfo> {
	const data = await gql<{ location: RawLocation }>(
		`query ($id: PositiveInt) {
			location(id: $id) {
				id musiconnId title slug
				categories { id label }
				children { id }
				parents { id }
				latitude longitude
			}
		}`,
		{ id }
	);
	const loc = data.location;
	if (!loc) return {} as LocationInfo;

	const geometries = [];
	if (typeof loc.latitude === 'number' || typeof loc.longitude === 'number') {
		geometries.push({
			geo: [loc.latitude ?? 0, loc.longitude ?? 0],
			label: loc.id
		});
	}

	return {
		uid: String(loc.id),
		title: loc.title,
		slug: loc.slug || '',
		categories: (loc.categories || []).map((c) => ({ label: categoryLabelToLegacyCode(c.label) })) as any,
		childs: (loc.children || []).map((c) => ({ location: c.id })) as any,
		parents: (loc.parents || []).map((p) => ({ location: p.id })) as any,
		geometries: geometries as any
	};
}

type RawLocation = {
	id: number;
	musiconnId: number;
	title: string;
	slug: string | null;
	latitude: number | null;
	longitude: number | null;
	categories: { id: number; label: string }[];
	children: { id: number }[];
	parents: { id: number }[];
};

/** Legacy `geometries` array `[ { geo: [lat, lng], label: id } ]` for a single location. */
export async function getGeometries(locationId: number): Promise<{ geo: number[]; label: number }[]> {
	const data = await gql<{ location: { latitude: number | null; longitude: number | null; id: number } }>(
		`query ($id: PositiveInt) { location(id: $id) { id latitude longitude } }`,
		{ id: locationId }
	);
	const loc = data.location;
	if (!loc || (loc.latitude == null && loc.longitude == null)) {
		return [{ geo: [0, 0], label: locationId }];
	}
	return [{ geo: [loc.latitude ?? 0, loc.longitude ?? 0], label: loc.id }];
}

/** Map each entity kind to its GraphQL field name and the legacy `allTitles` key. */
const TITLE_FIELD: Record<Entity, { query: 'person' | 'work' | 'location' | 'corporation' }> = {
	person: { query: 'person' },
	composer: { query: 'person' },
	work: { query: 'work' },
	location: { query: 'location' },
	corporation: { query: 'corporation' }
};

/**
 * Fetch titles for a batch of ids of a given kind. The old API returned
 * `{ <kind>: { <id>: { title } } }`; this returns the same `{ <id>: { title } }` shape.
 * Multiple ids are fetched in a single GraphQL request by aliasing `person(id)/work(id)/...`.
 */
export async function getTitlesByIds(
	kind: Entity,
	ids: (number | string)[]
): Promise<{ [id: number]: { title: string } }> {
	const { query } = TITLE_FIELD[kind];
	const uniqueIds = Array.from(new Set(ids.map((id) => Number(id)))).filter((id) => !Number.isNaN(id));
	if (uniqueIds.length === 0) return {};

	const result: { [id: number]: { title: string } } = {};
	// GraphQL alias name must match /^[_A-Za-z][_0-9A-Za-z]*$/.
	const alias = (id: number) => `n_${id}`;

	const chunks: number[][] = [];
	for (let i = 0; i < uniqueIds.length; i += 100) {
		chunks.push(uniqueIds.slice(i, i + 100));
	}

	for (const chunk of chunks) {
		const fields = chunk
			.map((id) => `${alias(id)}: ${query}(id: ${id}) { title }`)
			.join('\n');
		const data = await gql<Record<string, { title: string } | null>>(`{ ${fields} }`);
		for (const id of chunk) {
			const node = data[alias(id)];
			if (node?.title) {
				result[id] = { title: node.title };
			}
		}
	}
	return result;
}

/** Number of events associated with an entity (legacy `action=query&...&entity=none`). */
export async function getSuggestionCount(entity: Entity, id: number): Promise<number> {
	// The `composer` concept maps to a person that composed a performed work; the
	// dedicated count query is the same `personId` filter.
	const queryKey: Record<Entity, 'personId' | 'workId' | 'locationId' | 'corporationId'> = {
		person: 'personId',
		composer: 'personId',
		work: 'workId',
		location: 'locationId',
		corporation: 'corporationId'
	};
	const key = queryKey[entity];
	const data = await gql<{ events: { count: number } }>(
		`{ events(${key}: ${id}) { count } }`
	);
	return data.events?.count ?? 0;
}

/** Person details needed by `formatFilter` (legacy `props=biography|names`). */
export async function getPersonForFilter(
	id: number
): Promise<{ title: string; dateOfBirth: number | null; dateOfDeath: number | null }> {
	const data = await gql<{ person: { title: string; dateOfBirth: number | null; dateOfDeath: number | null } }>(
		`{ person(id: ${id}) { title dateOfBirth dateOfDeath } }`
	);
	return data.person || { title: '', dateOfBirth: null, dateOfDeath: null };
}

/** Work details needed by `formatFilter` (legacy `props=names|composers`). */
export async function getWorkForFilter(
	id: number
): Promise<{ title: string; composerId: number | null }> {
	const data = await gql<{
		work: {
			title: string;
			involvedPersons: { person: { id: number }; subjects: { id: number; title: string }[] }[];
		};
	}>(
		`{ work(id: ${id}) { title involvedPersons { person { id } subjects { id title } } } }`
	);
	const work = data.work;
	const composer = (work?.involvedPersons || []).find((ip) =>
		(ip.subjects || []).some(isCompositionSubject)
	);
	return { title: work?.title || '', composerId: composer?.person?.id ?? null };
}

/* ------------------------------------------------------------------ */
/* Autocomplete: client-side preload + prefix search (no server name  */
/* search exists on the new API).                                     */
/* ------------------------------------------------------------------ */

type AcEntry = { id: number; title: string; entity: Entity };

const ENTITY_LIST: Record<Entity, { query: string; sort: string } | null> = {
	person: { query: 'personList', sort: 'TITLE_ASC' },
	composer: { query: 'personList', sort: 'TITLE_ASC' },
	corporation: { query: 'corporationList', sort: 'TITLE_ASC' },
	work: { query: 'workList', sort: 'TITLE_ASC' },
	location: { query: 'locationList', sort: 'TITLE_ASC' }
};

const preloadedEntities = new Set<Entity>();
const inMemoryIndex: Map<Entity, AcEntry[]> = new Map([
	['person', []],
	['composer', []],
	['corporation', []],
	['work', []],
	['location', []]
]);

function openDb(): Promise<IDBDatabase | null> {
	return new Promise((resolve) => {
		if (!browser || typeof indexedDB === 'undefined') {
			resolve(null);
			return;
		}
		try {
			const req = indexedDB.open(AUTOCOMPLETE_DB, 1);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(AUTOCOMPLETE_STORE)) {
					db.createObjectStore(AUTOCOMPLETE_STORE);
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}

async function loadIndexFromDb(entity: Entity): Promise<AcEntry[] | null> {
	const db = await openDb();
	if (!db) return null;
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(AUTOCOMPLETE_STORE, 'readonly');
			const store = tx.objectStore(AUTOCOMPLETE_STORE);
			const get = store.get(entity);
			get.onsuccess = () => resolve((get.result as AcEntry[]) || null);
			get.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}

async function saveIndexToDb(entity: Entity, entries: AcEntry[]): Promise<void> {
	const db = await openDb();
	if (!db) return;
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(AUTOCOMPLETE_STORE, 'readwrite');
			tx.objectStore(AUTOCOMPLETE_STORE).put(entries, entity);
			tx.oncomplete = () => resolve();
			tx.onerror = () => resolve();
		} catch {
			resolve();
		}
	});
}

/** Preload all entries of the given entity kind into the in-memory + IndexedDB cache. */
export async function preloadEntityIndex(entity: Entity): Promise<AcEntry[]> {
	const cached = inMemoryIndex.get(entity);
	if (cached && cached.length > 0) return cached;
	if (preloadedEntities.has(entity)) {
		// Another in-flight preload; wait until memory is populated.
		await new Promise((resolve) => setTimeout(resolve, 300));
		return inMemoryIndex.get(entity) || [];
	}

	// `composer` shares the person index.
	if (entity === 'composer') {
		await preloadEntityIndex('person');
		return inMemoryIndex.get('composer') || [];
	}

	preloadedEntities.add(entity);

	const config = ENTITY_LIST[entity];
	if (!config) return [];

	// Try persisted cache first (versioned).
	if (browser && localStorage.getItem(AUTOCOMPLETE_VERSION_KEY) === AUTOCOMPLETE_VERSION) {
		const persisted = await loadIndexFromDb(entity);
		if (persisted && persisted.length > 0) {
			inMemoryIndex.set(entity, persisted);
			if (entity === 'person') inMemoryIndex.set('composer', persisted);
			return persisted;
		}
	}

	const entries: AcEntry[] = [];
	const fetchPage = async (page: number) => {
		const data = await gql<{ [k: string]: { list: { id: number; title: string }[]; pageInfo: { totalPages: number } } }>(
			`query ($page: PositiveInt) { ${config.query}(page: $page, pageSize: 100, sort: ${config.sort}) { list { id title } pageInfo { totalPages } } }`,
			{ page }
		);
		return data[config.query];
	};
	try {
		const first = await fetchPage(1);
		const totalPages = first?.pageInfo?.totalPages ?? 1;
		const push = (page?: any) => {
			for (const item of page?.list || []) {
				if (item.title) entries.push({ id: item.id, title: item.title, entity });
			}
		};
		push(first);

		// Fetch remaining pages concurrently (bounded) to keep the one-time preload fast.
		const concurrency = 10;
		const pages: number[] = [];
		for (let p = 2; p <= totalPages && p <= 100000; p++) pages.push(p);
		for (let i = 0; i < pages.length; i += concurrency) {
			const batch = pages.slice(i, i + concurrency);
			const results = await Promise.all(batch.map((p) => fetchPage(p).catch(() => null)));
			// Re-sort this batch's results back into page order before pushing.
			results.forEach((r) => push(r));
		}
	} catch (error) {
		console.error(`Failed to preload ${entity} index:`, error);
	}

	// entries arrive sorted by title already; keep them sorted (case-insensitive).
	entries.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

	inMemoryIndex.set(entity, entries);
	if (entity === 'person') inMemoryIndex.set('composer', entries);
	if (browser) {
		saveIndexToDb(entity, entries).catch(() => {});
		localStorage.setItem(AUTOCOMPLETE_VERSION_KEY, AUTOCOMPLETE_VERSION);
	}

	return entries;
}

/** Browser-only status probe, used by the search UI to hint "still indexing". */
export function isEntityIndexReady(entity: Entity): boolean {
	const list = inMemoryIndex.get(entity);
	return !!list && list.length > 0;
}

/**
 * Synchronous prefix lookup over the cached index. Returns `[title, entity, id]`
 * tuples (the legacy `AutocompleteResult` shape). Does NOT fetch; call
 * `preloadEntityIndex` for each enabled entity before/while typing.
 */
export function suggestByPrefix(input: string, entities: Entity[], max = 20): AutocompleteResult[] {
	const q = input.trim().toLowerCase();
	if (!q) return [];
	const results: AutocompleteResult[] = [];
	for (const entity of entities) {
		const list = inMemoryIndex.get(entity) || [];
		const dedupe = new Set<number>();
		for (const entry of list) {
			if (results.length >= max) break;
			if (dedupe.has(entry.id)) continue;
			if (entry.title.toLowerCase().startsWith(q)) {
				dedupe.add(entry.id);
				// Tag the suggestion with the entity kind the user is searching under, so
				// `composer` results (which share the person index) are labelled correctly.
				results.push([entry.title, entity, String(entry.id)]);
			}
		}
		if (results.length >= max) break;
	}
	return results;
}

export { AUTOCOMPLETE_VERSION };