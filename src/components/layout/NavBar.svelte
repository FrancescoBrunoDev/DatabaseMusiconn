<script lang="ts">
	import LL from '$lib/i18n/i18n-svelte';
	import ThemeSwitch from '$databaseMusiconn/components/layout/ThemeSwitch.svelte';
	import { page } from '$app/state';
	import Button from '$databaseMusiconn/components/ui/Button.svelte';

	let isHomePage = $derived(page.url.pathname === '/');

	const { value, handleLocaleChange } = $props<{ value: Locales; handleLocaleChange: any }>();
</script>

<div class="fixed top-3 inset-x-0 z-40 flex h-10 items-center justify-center">
	<div class="container">
		<div
			class="bg-border/50 dark:bg-dark-border/50 rounded-xl w-full flex justify-between text-lg p-2 backdrop-blur-lg"
		>
			<ul class="flex items-center">
				{#if !isHomePage}
					<li>
						<a class="font-bold" href="/">{$LL.navbar.home()}</a>
					</li>
				{/if}
			</ul>
			<div class="flex gap-x-2">
				<Button type="button" label={value === 'en' ? 'de' : 'en'} action={handleLocaleChange} />
				<ThemeSwitch />
			</div>
		</div>
	</div>
</div>
