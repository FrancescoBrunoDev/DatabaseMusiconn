<script lang="ts">
	import LL from '$lib/i18n/i18n-svelte';
	import { getTitleString, allTitles } from '$databaseMusiconn/stores/storeEvents';

	interface Props {
		performance: EventPerformance;
	}

	let { performance }: Props = $props();

	let isPersonOpen = $state(false);

	// Optimized synchronous version - gets titles immediately if cached
	function joinPersons(persons: Person[]) {
		const titles = persons.map((person) => getTitleString(person.person, 'person'));
		return titles.join(' | ');
	}

	// Derived state for immediate updates that reacts to store changes
	const personsText = $derived.by(() => {
		// Access the store to make this reactive
		$allTitles;
		return performance.persons ? joinPersons(performance.persons) : '';
	});
</script>

{#if performance.persons}
	<button
		onclick={() => (isPersonOpen = !isPersonOpen)}
		class="pl-1 font-bold hover:scale-103 dark:font-semibold">{$LL.events.performedBy()}</button
	>
{/if}

{#if isPersonOpen && performance.persons}
	<span>:</span>
	<span class="text-sm">{personsText}</span>
{/if}
