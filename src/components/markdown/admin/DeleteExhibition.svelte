<script lang="ts">
	import Button from '$components/ui/Button.svelte';
	import { invalidateAll } from '$app/navigation';
	interface Props {
		exhibitionId: string;
	}
	let { exhibitionId }: Props = $props();

	async function handleDeleteExhibition() {
		const res = await fetch('/api/exhibitions/pb/deleteExhibition', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: exhibitionId
			})
		});
		const result = await res.json();

		if (result.success) {
			//TODO: do something
			await invalidateAll();
		} else {
			//TODO: ui missing
			console.error('Error deleting new exhibition');
		}
	}
</script>

<Button
	action={handleDeleteExhibition}
	className="px-4 w-fit bg-destructive dark:text-text dark:text-dark-text"
	type="button"
	size="sm"
	label="Delete"
></Button>
