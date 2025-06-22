<script lang="ts">
	import { mainLocationInfo } from '$databaseMusiconn/stores/storeEvents';
	import LL from '$lib/i18n/i18n-svelte';
</script>

{#if $mainLocationInfo?.title}
	<div
		class="bg-border/50 dark:bg-dark-border/50 backdrop-blur-lg flex-col flex scale-90 gap-1 rounded-xl p-2 sm:scale-100"
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
