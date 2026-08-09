<script lang="ts">
import Modal from '$databaseMusiconn/components/ui/Modal.svelte';
import Event from './Event.svelte';

interface Props {
	event: EventItem | null;
	isEventOpen?: boolean;
}

let { event, isEventOpen = $bindable() }: Props = $props();
</script>

<Modal bind:isOpen={isEventOpen}>
	{#if event}
		<Event event={event} isModalOpen={isEventOpen} />
	{/if}
</Modal>
