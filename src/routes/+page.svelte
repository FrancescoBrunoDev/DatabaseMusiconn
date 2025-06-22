<script lang="ts">
	import * as config from '$lib/config';
	import SearchBox from '$databaseMusiconn/components/searchAndFilters/SearchBox.svelte';
	import { entitiesForSearchBox, filters } from '$databaseMusiconn/stores/storeFilters';
	import { goto } from '$app/navigation';
	import Background from '$databaseMusiconn/components/layout/Background.svelte';

	entitiesForSearchBox.set(['location']);
	$inspect($filters);
	// if filters change goto to /database/{$filters.and[0].id}
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

<div class="h-screen flex flex-col items-center justify-center">
	<div class="text-center max-w-xl w-full px-6 mb-8">
		<h1 class="text-8xl font-bold mb-4 drop-shadow-xl">SoundTrails</h1>
		<h2 class="text-2xl font-semibold mb-3 drop-shadow-x">Where Music History Lives</h2>
		<p class="text-xl mb-3 drop-shadow-x">
			Explore concert halls, theaters, and iconic venues across time.
		</p>
		<p class="text-sm">
			Built with data from <a
				href="https://performance.musiconn.de/"
				class="underline hover:text-primary">musiconn.performance</a
			>
		</p>
	</div>
	<div id="mainSearchSection" class="w-full max-w-xl">
		<SearchBox entities={[]} methodSearchVisible={false} />
	</div>
</div>
<Background />
