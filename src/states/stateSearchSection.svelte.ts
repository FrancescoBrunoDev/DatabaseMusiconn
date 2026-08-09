import {
	getSuggestionCounts,
	preloadEntityIndex,
	suggestByPrefix
} from '$databaseMusiconn/lib/musiconnApi';
import { entitiesForSearchBox, filters } from '$databaseMusiconn/stores/storeFilters';
import { get } from 'svelte/store';

type SuggestionWithCount = AutocompleteResult & { count?: number };
const suggestionCountCache = new Map<string, number>();

let suggestions = $state<SuggestionWithCount[]>([]);
let inputValue = $state<string>('');
let isSearchSectionInEventsList = $state<boolean>(false);
let isSearchSectionInEventsListOpen = $state<boolean>(false);
let isLoadingSuggestions = $state<boolean>(false);

function setInputValue({ value }: { value: string }) {
	inputValue = value;

	// If input is cleared, immediately clear suggestions
	if (value.trim() === '') {
		suggestions = [];
		isLoadingSuggestions = false;
	}
}

function getSuggestions() {
	return suggestions;
}

function deleteSuggestions() {
	suggestions = [];
}

function getInputValue() {
	return inputValue;
}

function setIsSearchSectionInEventsList({ value }: { value: boolean }) {
	isSearchSectionInEventsList = value;
}

function getIsSearchSectionInEventsList() {
	return isSearchSectionInEventsList;
}

function setIsSearchSectionInEventsListOpen({ value }: { value: boolean }) {
	isSearchSectionInEventsListOpen = value;
}

function getIsSearchSectionInEventsListOpen() {
	return isSearchSectionInEventsListOpen;
}

function getIsLoadingSuggestions() {
	return isLoadingSuggestions;
}

function setIsLoadingSuggestions({ value }: { value: boolean }) {
	isLoadingSuggestions = value;
}

// Helper function to add counts to suggestions and sort them.
// Counts come from the new GraphQL API (`events(personId|workId|...){ count }`),
// replacing the legacy `action=query&...&entity=none` call.
async function enrichAndSortSuggestions(
	baseSuggestions: AutocompleteResult[]
): Promise<SuggestionWithCount[]> {
	const items = baseSuggestions.map((suggestion) => ({
		entity: (suggestion[1] as Entity) || 'person',
		id: Number(suggestion[2])
	}));
	const missing = items.filter((item) => !suggestionCountCache.has(`${item.entity}:${item.id}`));
	if (missing.length > 0) {
		const fetched = await getSuggestionCounts(missing);
		for (const [key, count] of Object.entries(fetched)) suggestionCountCache.set(key, count);
	}
	return baseSuggestions
		.map((suggestion, index) => {
			const item = items[index];
			return {
				...suggestion,
				count: suggestionCountCache.get(`${item.entity}:${item.id}`) ?? 0
			};
		})
		.sort((a, b) => (b.count || 0) - (a.count || 0));
}

// Helper function to remove suggestions that are already in filters
function removeFormSuggestionIfInFilters(results: AutocompleteResult[]): AutocompleteResult[] {
	const filter = get(filters);
	const mapFilterItems = (items: Filter[]) =>
		items.map((item) => ({
			id: item.id,
			entity: item.entity === 'composer' ? 'person' : item.entity
		}));
	const activeItems = [
		...mapFilterItems(filter.not),
		...mapFilterItems(filter.or),
		...mapFilterItems(filter.and)
	];

	return results.filter(
		(result) => !activeItems.some((item) => item.id == result[2] && item.entity == result[1])
	);
}

let lastAutocompleteToken = 0;

const computeSuggestions = async (token: number) => {
	const _entitiesForSearchBox: Entity[] = get(entitiesForSearchBox);
	const entities = _entitiesForSearchBox;
	const value = inputValue;

	if (entities.length === 0 || value.trim() === '') {
		if (token === lastAutocompleteToken) suggestions = [];
		return;
	}

	// Prefix-match over whatever has loaded so far (the index populates
	// incrementally as pages arrive).
	const results = suggestByPrefix(value, entities, 20);
	const filteredSuggestions = removeFormSuggestionIfInFilters(results);
	if (filteredSuggestions.length === 0) {
		if (token === lastAutocompleteToken) suggestions = [];
		return;
	}

	const enrichedSuggestions = await enrichAndSortSuggestions(filteredSuggestions);
	if (token !== lastAutocompleteToken) return; // a newer keystroke won

	suggestions = [];
	await new Promise((resolve) => setTimeout(resolve, 50));
	if (token === lastAutocompleteToken) suggestions = enrichedSuggestions;
};

const autocomplete = async () => {
	const _entitiesForSearchBox: Entity[] = get(entitiesForSearchBox);
	const entities = _entitiesForSearchBox;

	// If input is empty or entities are not selected, clear suggestions
	if (entities.length === 0 || inputValue.trim() === '') {
		suggestions = [];
		isLoadingSuggestions = false;
		return;
	}

	// Set loading state
	isLoadingSuggestions = true;

	const token = ++lastAutocompleteToken;

	try {
		// Kick off preloading for every enabled entity kind. It populates the
		// in-memory index INCREMENTALLY, so we can show suggestions from whatever has
		// loaded so far instead of blocking ~80s on the full preload.
		const preload = Promise.all(entities.map((entity) => preloadEntityIndex(entity)));

		// First pass: match against whatever is already in the index (cached pages,
		// persisted IndexedDB cache, or pages that already streamed in).
		await computeSuggestions(token);

		// Once the full preload finishes, recompute: more entries will be available,
		// potentially surfacing matches that weren't there on the first pass.
		await preload;
		if (token === lastAutocompleteToken) {
			await computeSuggestions(token);
		}
	} catch (error) {
		console.error('Error fetching suggestions:', error);
		if (token === lastAutocompleteToken) suggestions = [];
	} finally {
		if (token === lastAutocompleteToken) isLoadingSuggestions = false;
	}
};

export {
	autocomplete,
	deleteSuggestions,
	getInputValue,
	getIsLoadingSuggestions,
	getIsSearchSectionInEventsList,
	getIsSearchSectionInEventsListOpen,
	getSuggestions,
	setInputValue,
	setIsLoadingSuggestions,
	setIsSearchSectionInEventsList,
	setIsSearchSectionInEventsListOpen
};
