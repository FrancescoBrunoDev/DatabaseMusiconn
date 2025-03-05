import { urlBaseAPIMusiconn } from '$states/stateGeneral.svelte';
import { projectID } from '$stores/storeEvents';
import { entitiesForSearchBox, filters } from '$stores/storeFilters';
import { get } from 'svelte/store';

let suggestions = $state<AutocompleteResult[]>([]);
let inputValue = $state<string>('');
let isSearchSectionInEventsList = $state<boolean>(false);
let isSearchSectionInEventsListOpen = $state<boolean>(false);

function setInputValue({ value }: { value: string }) {
	inputValue = value;
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

const autocomplete = async () => {
	let _entitiesForSearchBox: string[] = get(entitiesForSearchBox);

	function removeFormSuggestionIfInFilters(results: AutocompleteResult[]) {
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
	const entities = _entitiesForSearchBox.join('|');
	if (entities.length !== 0) {
		try {
			let _projectID: number = get(projectID);

			const res = await fetch(
				`${urlBaseAPIMusiconn}?action=autocomplete&title=${inputValue}&entities=${entities}&max=20${projectID ? `&project=${_projectID}` : ''}&format=json`
			);
			const results = await res.json();
			const filteredSuggestions = removeFormSuggestionIfInFilters(results);
			suggestions = filteredSuggestions;
		} catch (error) {
			console.error(
				'Error fetching all events with the project id:',
				error,
				'try without project id'
			);
			try {
				const res = await fetch(
					`${urlBaseAPIMusiconn}?action=autocomplete&title=${inputValue}&entities=${entities}&max=20&format=json`
				);
				const results = await res.json();
				const filteredSuggestions = removeFormSuggestionIfInFilters(results);
				suggestions = filteredSuggestions;
			} catch (error) {
				console.error('Error fetching all events with the project id:', error);
				return [];
			}
		}
	}
};

export {
	autocomplete,
	deleteSuggestions,
	getInputValue,
	getIsSearchSectionInEventsList,
	getIsSearchSectionInEventsListOpen,
	getSuggestions,
	setInputValue,
	setIsSearchSectionInEventsList,
	setIsSearchSectionInEventsListOpen
};
