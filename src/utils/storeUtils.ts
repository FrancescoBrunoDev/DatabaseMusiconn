import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export function persistStore<T>(key: string, initialValue: T) {
	let storedValue;
	if (browser && typeof localStorage !== 'undefined') {
		storedValue = localStorage.getItem(key);
	}
	const data = storedValue ? JSON.parse(storedValue) : initialValue;

	const store = writable<T>(data);

	// Only subscribe to changes in the browser
	if (browser) {
		store.subscribe((value) => {
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(key, JSON.stringify(value));
			}
		});
	}

	return store;
}
