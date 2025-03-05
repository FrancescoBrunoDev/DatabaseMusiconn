<script lang="ts">
	import MainDatabase from '$databaseMusiconn/components/MainDatabase.svelte';
	import ListeEvents from '$databaseMusiconn/components/listEvents/ListEvents.svelte';
	import SettingsDatabase from '$databaseMusiconn/components/listEvents/SettingsDatabase.svelte';

	let { children } = $props();
</script>

<section class="isolate container">
	<div class="sticky top-10 right-0 z-40 flex justify-end sm:top-16">
		<div
			class="bg-background dark:bg-dark-background flex scale-90 gap-2 rounded-xl border-2 p-2 drop-shadow-xl sm:scale-100"
		>
			<SettingsDatabase />
		</div>
	</div>

	<MainDatabase />
	<ListeEvents />
	{@render children?.()}
</section>
