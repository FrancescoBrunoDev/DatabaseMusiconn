<script lang="ts">
	import { mainLocationInfo } from '$databaseMusiconn/stores/storeEvents';
	import { getTitle, getTitleString } from '$databaseMusiconn/stores/storeEvents';
	import LL from '$lib/i18n/i18n-svelte';

	async function getParentLocationLabel(): Promise<void> {
		// for each parent in mainLocationInfo.parents await the title
		if ($mainLocationInfo?.parents) {
			for (const parent of $mainLocationInfo.parents) {
				await getTitle([String(parent)], 'location');
			}
		}
	}

	let parentLocationTitle: string | undefined;

	async function getParentLocationTitle() {
		if ($mainLocationInfo?.parents?.[0].location) {
			parentLocationTitle = await getTitleString($mainLocationInfo.parents[0].location, 'location');
		}
	}

	$effect(() => {
		console.log('MainLocationInfo updated:', $mainLocationInfo);
		if ($mainLocationInfo?.parents?.[0].location) {
			console.log('Fetching parent location title...', $mainLocationInfo?.parents?.[0].location);
			getParentLocationTitle();
		}
	});

	$inspect(parentLocationTitle);
</script>

{#if $mainLocationInfo?.title}
	<div
		class="bg-background flex-col dark:bg-dark-background flex scale-90 gap-1 rounded-xl border-2 p-2 drop-shadow-xl sm:scale-100"
	>
		<span class="text-lg font-bold">{$mainLocationInfo.title} </span>
		<span class="text-xs"
			>{$LL.events.categories.labels.locations[
				String(
					$mainLocationInfo.categories[0].label
				) as keyof typeof $LL.events.categories.labels.locations
			]()}</span
		>
	</div>
{/if}
