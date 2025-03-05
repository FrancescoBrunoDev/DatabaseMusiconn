import { browser } from '$app/environment';
import { LocalStorage } from '$lib/storage.svelte';

const urlBaseAPIMusiconn = $state('https://performance.musiconn.de/api');

let locale = new LocalStorage<Locales>('lang', 'en');
let themeKind = new LocalStorage<ThemeKind>('theme', 'base');

function setFirstThemeData() {
	if (browser) {
		if (themeKind.current === 'dark') {
			document.documentElement.classList.remove('base');
			document.documentElement.classList.add('dark');
		} else if (themeKind.current === 'base') {
			document.documentElement.classList.remove('dark');
			document.documentElement.classList.add('base');
		}
	}
}

function toggleTheme() {
	if (browser) {
		if (themeKind.current === 'dark') {
			themeKind.current = 'base';
			document.documentElement.classList.remove('dark');
			document.documentElement.classList.add('base');
		} else if (themeKind.current === 'base') {
			themeKind.current = 'dark';
			document.documentElement.classList.remove('base');
			document.documentElement.classList.add('dark');
		}
	}
}

export { locale, setFirstThemeData, themeKind, toggleTheme, urlBaseAPIMusiconn };
