import { setLocale } from '$lib/i18n/i18n-svelte';
import { detectLocale } from '$lib/i18n/i18n-util';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import type { Handle } from '@sveltejs/kit';
import {
	initAcceptLanguageHeaderDetector,
	initRequestCookiesDetector
} from 'typesafe-i18n/detectors';

export const handle: Handle = async ({ event, resolve }) => {
	// Locale handling
	let deafultLocale = 'en';

	const acceptLanguageHeaderDetector = initAcceptLanguageHeaderDetector(event.request);
	const localeFromHeaders = detectLocale(acceptLanguageHeaderDetector);

	if (!localeFromHeaders) {
		// if locale is not present in headers, try fetching it from cookies
		const requestCookiesDetector = initRequestCookiesDetector({
			cookies: event.cookies.get('lang') || ''
		});
		const localeFromCookies = detectLocale(requestCookiesDetector);
		if (localeFromCookies) {
			deafultLocale = localeFromCookies;
		} else {
			// add in cookes
			event.cookies.set('lang', deafultLocale, { path: '/' });
		}
	} else {
		deafultLocale = localeFromHeaders;
	}
	const locale = detectLocale(() => [deafultLocale]);
	// Load it
	await loadLocaleAsync(locale);
	// Set it
	setLocale(locale);
	// [OPTIONAL] set locale within locals property
	event.locals.locale = deafultLocale;

	// Handle response
	const response = await resolve(event);
	return response;
};
