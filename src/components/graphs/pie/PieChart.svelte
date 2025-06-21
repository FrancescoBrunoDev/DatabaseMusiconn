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
		labelPadding?: number;
	}>();

	let svg = $state<SVGSVGElement | null>(null);
	let chartArea = $state<SVGGElement | null>(null);
	let labelsGroup = $state<SVGGElement | null>(null);

	// Calculate the actual dimensions with space for labels
	const effectiveWidth = width;
	const effectiveHeight = height;
	const svgWidth = width * 1.5;
	const svgHeight = height * 1.5;

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
		if (!svg || !chartArea || !labelsGroup) return;

		// Clear previous chart
		while (chartArea.firstChild) {
			chartArea.removeChild(chartArea.firstChild);
		}

		// Clear previous labels
		while (labelsGroup.firstChild) {
			labelsGroup.removeChild(labelsGroup.firstChild);
		}

		const radius = Math.min(effectiveWidth, effectiveHeight) / 2;
		const centerX = svgWidth / 2;
		const centerY = svgHeight / 2;

		// Calculate total for percentages
		const total = data.reduce((sum: number, item: { count: number }) => sum + item.count, 0);

		let startAngle = 0;
		let endAngle = 0;

		// Draw pie segments
		data.forEach((item: { id: string; count: number; color: string }) => {
			const percentage = item.count / total;
			endAngle = startAngle + percentage * 2 * Math.PI;

			// Calculate middle angle for this segment
			const midAngle = startAngle + (endAngle - startAngle) / 2;

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
			path.setAttribute('fill', 'transparent'); // Default fill color
			path.setAttribute('stroke', 'hsl(var(--primary))');
			path.setAttribute('stroke-width', '1');

			if (chartArea) {
				chartArea.appendChild(path);
			}

			// Create label with connector line
			const name = names[item.id] || item.id;
			const labelText = `${name}: ${item.count} (${(percentage * 100).toFixed(1)}%)`;

			// Calculate position for label and connector line
			const midRadius = radius * 0.7; // Point on the pie
			const labelRadius = radius * 1.2; // Point for the label

			const midX = centerX + midRadius * Math.cos(midAngle);
			const midY = centerY + midRadius * Math.sin(midAngle);

			const labelX = centerX + labelRadius * Math.cos(midAngle);
			const labelY = centerY + labelRadius * Math.sin(midAngle);

			// Create connector line
			const connector = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			connector.setAttribute('x1', midX.toString());
			connector.setAttribute('y1', midY.toString());
			connector.setAttribute('x2', labelX.toString());
			connector.setAttribute('y2', labelY.toString());
			connector.setAttribute('stroke', 'hsl(var(--primary))');
			connector.setAttribute('stroke-width', '1');
			if (labelsGroup) {
				labelsGroup.appendChild(connector);
			}

			// Create label text
			const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			text.setAttribute('x', labelX.toString());
			text.setAttribute('y', labelY.toString());
			text.setAttribute('font-size', '10px');
			text.setAttribute('text-anchor', 'middle');
			text.setAttribute('alignment-baseline', 'middle');
			text.textContent = name;
			if (labelsGroup) {
				labelsGroup.appendChild(text);
			}

			startAngle = endAngle;
		});
	}
</script>

<div class="relative">
	<svg bind:this={svg} width={svgWidth} height={svgHeight}>
		<g bind:this={chartArea} transform={`translate(0, 0)`}></g>
		<g bind:this={labelsGroup} transform={`translate(0, 0)`}></g>
	</svg>
	<div class="text-center font-bold mb-1 text-sm">{title}</div>
</div>
