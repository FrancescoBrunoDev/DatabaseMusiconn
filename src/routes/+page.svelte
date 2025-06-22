<script lang="ts">
	import * as config from '$lib/config';
	import SearchBox from '$databaseMusiconn/components/searchAndFilters/SearchBox.svelte';
	import { entitiesForSearchBox, filters } from '$databaseMusiconn/stores/storeFilters';
	import { goto } from '$app/navigation';
	import Background from '$databaseMusiconn/components/layout/Background.svelte';

	entitiesForSearchBox.set(['location']);

	// This effect will redirect the user to the first filter's database page if it exists, or to the home page if no filters are set.
	$effect(() => {
		if ($filters.and.length > 0) {
			const firstFilter = $filters.and[0];
			if (firstFilter.id) {
				const url = `/database/${firstFilter.id}`;
				if (window.location.pathname !== url) {
					goto(url);
				}
			}
		} else {
			if (window.location.pathname !== '/database') {
				goto('/');
			}
		}
	});
</script>

<svelte:head>
	<title>{config.title}</title>
</svelte:head>

<div class="h-screen flex flex-col gap-4 items-center justify-center container">
	<div
		class="bg-background/20 dark:bg-dark-border/50 backdrop-blur-lg max-w-2xl w-full rounded-xl p-6 flex flex-col items-center justify-center"
	>
		<div class="text-center px-6 mb-8 max-w-full">
			<h1 class="text-6xl sm:text-8xl font-bold mb-4">
				<span class="block md:hidden">Sound<br />Trails</span>
				<span class="hidden md:block">SoundTrails</span>
			</h1>
			<h2 class="text-2xl font-semibold mb-3">Where Music History Lives</h2>
			<p class="text-xl mb-3">Explore concert halls, theaters, and iconic venues across time.</p>
			<p class="text-sm">
				Built with data from <a
					href="https://performance.musiconn.de/"
					class="underline hover:text-primary">musiconn.performance</a
				>
			</p>
		</div>
	</div>
	<div id="mainSearchSection" class="w-full max-w-2xl">
		<SearchBox entities={[]} methodSearchVisible={false} />
	</div>
</div>
<Background />
