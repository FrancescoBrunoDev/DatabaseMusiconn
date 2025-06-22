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

<div class=" snap-y snap-mandatory">
	<div
		class="relative container flex h-screen snap-center snap-always flex-col items-center justify-center gap-4"
	>
		<div
			class="bg-background/20 dark:bg-dark-border/50 absolute inset-x-0 top-20 mx-auto w-fit max-w-2xl flex-col items-center justify-center rounded-xl p-4 backdrop-blur-lg md:static md:flex md:w-full md:p-6"
		>
			<div class="mb:px-6 max-w-full text-center">
				<h1 class="mb:mb-4 text-5xl font-bold sm:text-8xl">
					<span class="">SoundTrails</span>
				</h1>
				<div class="hidden md:block">
					<h2 class="mb-3 text-2xl font-semibold">Where Music History Lives</h2>
					<p class="mb-3 text-xl">
						Explore concert halls, theaters, and iconic venues across time.
					</p>
					<p class="text-sm">
						Built with data from <a
							href="https://performance.musiconn.de/"
							class="hover:text-primary underline">musiconn.performance</a
						>
					</p>
				</div>
			</div>
		</div>
		<div id="mainSearchSection" class="w-full max-w-2xl">
			<SearchBox entities={[]} methodSearchVisible={false} />
		</div>
	</div>
	<Background />

	<div
		class="container flex h-screen snap-center snap-always flex-col items-center justify-center gap-4 md:hidden"
	>
		<div
			class="bg-background/20 dark:bg-dark-border/50 flex w-full max-w-2xl flex-col items-center justify-center rounded-xl p-6 backdrop-blur-lg"
		>
			<div class="max-w-full px-6 text-center">
				<div>
					<h2 class="mb-3 text-2xl font-semibold">Where Music History Lives</h2>
					<p class="mb-3 text-xl">
						Explore concert halls, theaters, and iconic venues across time.
					</p>
					<p class="text-sm">
						Built with data from <a
							href="https://performance.musiconn.de/"
							class="hover:text-primary underline">musiconn.performance</a
						>
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
