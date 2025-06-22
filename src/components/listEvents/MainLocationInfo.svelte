<script lang="ts">
	import { mainLocationInfo } from '$databaseMusiconn/stores/storeEvents';
	import LL from '$lib/i18n/i18n-svelte';
</script>

{#if $mainLocationInfo?.title}
	<div
		class="bg-background dark:bg-dark-background flex scale-90 gap-2 rounded-xl border-2 p-2 drop-shadow-xl sm:scale-100"
	>
		<span class="text-lg font-bold"
			>{$mainLocationInfo.title} {$LL.filters.entities.corporation()}</span
		>
	</div>
{/if}
ç
