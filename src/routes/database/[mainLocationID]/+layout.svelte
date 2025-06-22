<script lang="ts">
	import MainDatabase from '$databaseMusiconn/components/MainDatabase.svelte';
	import ListeEvents from '$databaseMusiconn/components/listEvents/ListEvents.svelte';
	import SettingsDatabase from '$databaseMusiconn/components/listEvents/SettingsDatabase.svelte';
	import MainLocationInfo from '$databaseMusiconn/components/listEvents/MainLocationInfo.svelte';
	import { mainLocationInfo } from '$databaseMusiconn/stores/storeEvents';

	let { children } = $props();
</script>

<svelte:head>
	<title>SoundTrails: {$mainLocationInfo?.title}</title>
	<meta name="description" content="SoundTrails: {$mainLocationInfo?.title}" />
</svelte:head>

<section class="isolate container">
	<div class="sticky inset-0 top-16 z-40 flex justify-between sm:top-18">
		<div><MainLocationInfo /></div>
		<div
			class="bg-background dark:bg-dark-background flex h-fit scale-90 gap-2 rounded-xl border-2 p-2 drop-shadow-xl sm:scale-100"
		>
			<SettingsDatabase />
		</div>
	</div>
	<MainDatabase />
	<ListeEvents />
	{@render children?.()}
</section>
