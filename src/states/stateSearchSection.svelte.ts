import { urlBaseAPIMusiconn } from '$databaseMusiconn/states/stateGeneral.svelte';
import { projectID } from '$databaseMusiconn/stores/storeEvents';
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

// Helper function to get suggestion count from API
async function getSuggestionCount(suggestionID: number, entity: string): Promise<number> {
	try {
		const _projectID: number | null = get(projectID);
		const res = await fetch(
			`${urlBaseAPIMusiconn}?action=query&${entity}=${suggestionID}&entity=none${_projectID ? `&project=${_projectID}` : ''}&format=json`
		);

		if (res.ok) {
			const { count } = await res.json();
			return Number(count.event) || 0;
		} else {
			console.error('Fetch failed', res.status, res.statusText);
			return 0;
		}
	} catch (error) {
		console.error('Error fetching suggestion count:', error);
		return 0;
	}
}

// Helper function to add counts to suggestions and sort them
async function enrichAndSortSuggestions(
	baseSuggestions: AutocompleteResult[]
): Promise<SuggestionWithCount[]> {
	const suggestionsWithCounts = await Promise.all(
		baseSuggestions.map(async (suggestion): Promise<SuggestionWithCount> => {
			const count = await getSuggestionCount(Number(suggestion[2]), suggestion[1] || '');
			return { ...suggestion, count };
		})
	);

	// Sort by count in descending order (highest count first)
	return suggestionsWithCounts.sort((a, b) => (b.count || 0) - (a.count || 0));
}

// Helper function to fetch suggestions from API
async function fetchSuggestions(
	entities: string,
	withProjectID: boolean = true
): Promise<AutocompleteResult[]> {
	const _projectID: number | null = get(projectID);
	const projectParam = withProjectID && _projectID ? `&project=${_projectID}` : '';

	const res = await fetch(
		`${urlBaseAPIMusiconn}?action=autocomplete&title=${inputValue}&entities=${entities}&max=20${projectParam}&format=json`
	);

	return await res.json();
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
	const _entitiesForSearchBox: string[] = get(entitiesForSearchBox);
	const entities = _entitiesForSearchBox.join('|');

	// If input is empty or entities are not selected, clear suggestions
	if (entities.length === 0 || inputValue.trim() === '') {
		suggestions = [];
		isLoadingSuggestions = false;
		return;
	}

	// Set loading state
	isLoadingSuggestions = true;

	try {
		// First, try to fetch suggestions with project ID
		let results = await fetchSuggestions(entities, true);

		// Filter out suggestions that are already in filters
		const filteredSuggestions = removeFormSuggestionIfInFilters(results);

		// Enrich with counts and sort by frequency
		suggestions = await enrichAndSortSuggestions(filteredSuggestions);
	} catch (error) {
		console.error(
			'Error fetching suggestions with project ID:',
			error,
			'trying without project ID'
		);

		try {
			// Fallback: try without project ID
			const results = await fetchSuggestions(entities, false);
			const filteredSuggestions = removeFormSuggestionIfInFilters(results);
			suggestions = await enrichAndSortSuggestions(filteredSuggestions);
		} catch (fallbackError) {
			console.error('Error fetching suggestions without project ID:', fallbackError);
			suggestions = [];
		}
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
