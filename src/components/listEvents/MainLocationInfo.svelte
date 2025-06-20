<script lang="ts">
	import { mainLocationInfo } from '$databaseMusiconn/stores/storeEvents';
</script>

{#if $mainLocationInfo?.title}
	<div
		class="bg-background dark:bg-dark-background flex scale-90 gap-2 rounded-xl border-2 p-2 drop-shadow-xl sm:scale-100"
	>
		<span class="text-lg font-bold">{$mainLocationInfo.title}</span>
	</div>
{/if}
