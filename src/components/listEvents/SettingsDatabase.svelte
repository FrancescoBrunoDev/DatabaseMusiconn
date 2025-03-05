<script lang="ts">
	import InfoSearch from '$databaseMusiconn/components/searchAndFilters/InfoSearch.svelte';
	import MenuDropdown from '$databaseMusiconn/components/ui/MenuDropdown.svelte';
	import CheckBox from '$databaseMusiconn/components/ui/CheckBox.svelte';
	import { isMoveToActive, showEventAsModal } from '$databaseMusiconn/stores/storeFilters';
	import LL from '$lib/i18n/i18n-svelte';
	import { Settings } from 'lucide-svelte';
</script>

<InfoSearch />
<MenuDropdown icon={Settings} direction={'bottom'}>
	<CheckBox
		title={$LL.events.settings.showMoreOptionsOnFilterOver()}
		bind:value={$isMoveToActive}
	/>
	<CheckBox title={$LL.events.settings.showEventAsModal()} bind:value={$showEventAsModal} />
</MenuDropdown>
