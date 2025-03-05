import { browser } from '$app/environment';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { detectLocale } from '$lib/i18n/i18n-util';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import { locale } from '$databaseMusiconn/states/stateGeneral.svelte';
import { navigatorDetector, sessionStorageDetector } from 'typesafe-i18n/detectors';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async (event) => {
	if (browser) {
		const deafultLocale = 'en';
		const _locale =
			detectLocale(sessionStorageDetector) ||
			detectLocale(navigatorDetector) ||
			locale.current ||
			deafultLocale;
		await loadLocaleAsync(_locale);
		setLocale(_locale);
	}
	return event.data;
};
