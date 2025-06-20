<script lang="ts">
	import { mainLocationInfo } from '$databaseMusiconn/stores/storeEvents';
</script>

{#if $mainLocationInfo.title}
	<div class="text-2xl font-bold mb-4">{$mainLocationInfo.title}</div>
{/if}
