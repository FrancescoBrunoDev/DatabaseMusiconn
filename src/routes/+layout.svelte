<script lang="ts">
	import '$tailwind';
	import { setFirstThemeData } from '$states/stateGeneral.svelte';
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import { setLocale } from '$lib/i18n/i18n-svelte';
	import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
	import { locale } from '$states/stateGeneral.svelte';
	import NavBar from '$databaseMusiconn/components/layout/NavBar.svelte';

	let value: Locales = $state('en');
	let { children } = $props();

	async function handleLocaleChange() {
		value = value === 'en' ? 'de' : 'en';
		await loadLocaleAsync(value);
		setLocale(value);
		locale.current = value;
	}

	onMount(async () => {
		const valueFromSession = locale.current || 'en';
		value = locale.current as Locales;
		await loadLocaleAsync(valueFromSession);
		setLocale(valueFromSession);
		locale.current = valueFromSession;
	});

	onDestroy(() => {
		if (browser) {
			sessionStorage.removeItem('lang');
		}
	});

	// at first load, set dark mode if the user prefers it
	setFirstThemeData();
</script>

<NavBar {value} {handleLocaleChange} />
{@render children?.()}

<style lang="postcss">
	@reference '$tailwind';

	:global {
		body {
			@apply bg-background dark:bg-dark-background dark:text-dark-text text-text text-base;
			transition:
				background-color 0.2s ease-in-out,
				color 0.2s ease-in-out;
			font-feature-settings:
				'rlig' 1,
				'calt' 1;
		}

		/* all the border must be color border */
		*,
		::after,
		::before,
		::backdrop,
		::file-selector-button {
			@apply border-border dark:border-dark-border border-solid;
		}

		/* allow border-primary to override the default */
		.border-primary,
		.border-primary::after,
		.border-primary::before {
			@apply border-primary dark:border-primary;
		}

		/* allow border-secondary to override the default */
		.border-secondary,
		.border-secondary::after,
		.border-secondary::before {
			@apply border-secondary dark:border-secondary;
		}

		/* allow border-background to override the default */
		.border-background,
		.border-background::after,
		.border-background::before {
			@apply border-background dark:border-dark-background;
		}

		button {
			@apply cursor-pointer;
		}
	}
</style>
