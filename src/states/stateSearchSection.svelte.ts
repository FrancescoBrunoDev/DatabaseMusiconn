import {
	getSuggestionCount,
	preloadEntityIndex,
	suggestByPrefix
} from '$databaseMusiconn/lib/musiconnApi';
import { entitiesForSearchBox, filters } from '$databaseMusiconn/stores/storeFilters';
import { get } from 'svelte/store';

type SuggestionWithCount = AutocompleteResult & { count?: number };

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
	const suggestionsWithCounts = await Promise.all(
		baseSuggestions.map(async (suggestion): Promise<SuggestionWithCount> => {
			const entity = (suggestion[1] as Entity) || 'person';
			const count = await getSuggestionCount(entity, Number(suggestion[2]));
			return { ...suggestion, count };
		})
	);

	// Sort by count in descending order (highest count first)
	return suggestionsWithCounts.sort((a, b) => (b.count || 0) - (a.count || 0));
}

// Helper function to remove suggestions that are already in filters
function removeFormSuggestionIfInFilters(results: AutocompleteResult[]): AutocompleteResult[] {
	let _results: AutocompleteResult[] = results;
	filters.subscribe((filter: any) => {
		const mapFilterItems = (items: Filter[]) =>
			items.map((item) => ({
				id: item.id,
				entity: item.entity === 'composer' ? 'person' : item.entity
			}));

		const notFilterItems = mapFilterItems(filter.not);
		const orFilterItems = mapFilterItems(filter.or);
		const andFilterItems = mapFilterItems(filter.and);

		const isFiltered = (result: any) => (item: any) =>
			item.id == result[2] && item.entity == result[1];

		const filteredResults = results.filter(
			(result: AutocompleteResult) =>
				![...notFilterItems, ...orFilterItems, ...andFilterItems].some(isFiltered(result))
		);
		_results = filteredResults;
	});
	return _results;
}

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

	try {
		// The new API has no server-side name search, so suggestions come from a
		// client-side prefix index that is preloaded once and cached (IndexedDB).
		// Kick off preloading for every enabled entity kind (no-op if already loaded).
		await Promise.all(entities.map((entity) => preloadEntityIndex(entity)));

		// Prefix-match over the cached, title-sorted index (legacy shape [title, entity, id]).
		const results = suggestByPrefix(inputValue, entities, 20);
		if (!results || results.length === 0) {
			suggestions = [];
			return;
		}

		// Filter out suggestions that are already in filters
		const filteredSuggestions = removeFormSuggestionIfInFilters(results);

		// Enrich with counts and sort by frequency
		const enrichedSuggestions = await enrichAndSortSuggestions(filteredSuggestions);

		// Clear suggestions first to trigger out animations, then set new ones to trigger in animations
		suggestions = [];
		await new Promise((resolve) => setTimeout(resolve, 50));
		suggestions = enrichedSuggestions;
	} catch (error) {
		console.error('Error fetching suggestions:', error);
		suggestions = [];
	} finally {
		// Clear loading state
		isLoadingSuggestions = false;
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