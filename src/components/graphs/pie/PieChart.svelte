<script lang="ts">
	import { onMount } from 'svelte';
	import { getTitleString } from '$databaseMusiconn/stores/storeEvents';

	const {
		data = [],
		title = '',
		width = 150,
		height = 150
	} = $props<{
		data?: {
			id: string;
			count: number;
			color: string;
		}[];
		title?: string;
		width?: number;
		height?: number;
	}>();

	let svg = $state<SVGSVGElement | null>(null);
	let chartArea = $state<SVGGElement | null>(null);
	let tooltip = $state<HTMLDivElement | null>(null);

	let tooltipText = $state('');
	let tooltipVisible = $state(false);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	const names = $state<Record<string, string>>({});

	async function loadNames() {
		for (const item of data) {
			const name = await getTitleString(parseInt(item.id), title.toLowerCase() as any);
			names[item.id] = name || item.id;
		}
	}

	$effect(() => {
		if (data && data.length > 0) {
			loadNames();
			drawChart();
		}
	});

	onMount(() => {
		if (data && data.length > 0) {
			drawChart();
		}
	});

	function drawChart() {
		if (!svg || !chartArea) return;

		// Clear previous chart
		while (chartArea.firstChild) {
			chartArea.removeChild(chartArea.firstChild);
		}

		const radius = Math.min(width, height) / 2;
		const centerX = width / 2;
		const centerY = height / 2;

		// Calculate total for percentages
		const total = data.reduce((sum: number, item: { count: number }) => sum + item.count, 0);

		let startAngle = 0;
		let endAngle = 0;

		// Draw pie segments
		data.forEach((item: { id: string; count: number; color: string }) => {
			const percentage = item.count / total;
			endAngle = startAngle + percentage * 2 * Math.PI;

			// Calculate path
			const x1 = centerX + radius * Math.cos(startAngle);
			const y1 = centerY + radius * Math.sin(startAngle);
			const x2 = centerX + radius * Math.cos(endAngle);
			const y2 = centerY + radius * Math.sin(endAngle);

			// Create arc path
			const largeArcFlag = percentage > 0.5 ? 1 : 0;
			const pathData = [
				`M ${centerX} ${centerY}`,
				`L ${x1} ${y1}`,
				`A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
				'Z'
			].join(' ');

			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('d', pathData);
			path.setAttribute('fill', item.color);
			path.setAttribute('stroke', 'white');
			path.setAttribute('stroke-width', '1');

			// Add event listeners for tooltip
			path.addEventListener('mousemove', (event) => {
				const name = names[item.id] || item.id;
				tooltipText = `${name}: ${item.count} (${(percentage * 100).toFixed(1)}%)`;
				tooltipX = event.clientX;
				tooltipY = event.clientY;
				tooltipVisible = true;
			});

			path.addEventListener('mouseleave', () => {
				tooltipVisible = false;
			});

			if (chartArea) {
				chartArea.appendChild(path);
			}
			startAngle = endAngle;
		});
	}
</script>

<div class="relative">
	<svg bind:this={svg} {width} {height}>
		<g bind:this={chartArea} transform={`translate(0, 0)`}></g>
	</svg>
	<div class="text-center font-bold mb-1 text-sm">{title}</div>

	{#if tooltipVisible}
		<div
			bind:this={tooltip}
			class="absolute bg-white dark:bg-gray-900 shadow-md rounded p-2 text-xs z-10"
			style="left: {tooltipX}px; top: {tooltipY - 40}px; transform: translateX(-50%);"
		>
			{tooltipText}
		</div>
	{/if}
</div>
