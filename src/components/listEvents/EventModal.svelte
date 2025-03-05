<script lang="ts">
	import Modal from '$components/ui/Modal.svelte';
	import Event from './Event.svelte';

	interface Props {
		event: EventItem;
		isEventOpen?: boolean;
	}

	let { event, isEventOpen = $bindable() }: Props = $props();
</script>

<Modal bind:isOpen={isEventOpen}>
	<Event {event} isModalOpen={isEventOpen} />
</Modal>
