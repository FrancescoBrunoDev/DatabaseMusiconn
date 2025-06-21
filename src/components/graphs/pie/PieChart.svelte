<script lang="ts">
	import { onMount } from 'svelte';
	import { getTitleString } from '$databaseMusiconn/stores/storeEvents';
	import { cn } from '$databaseMusiconn/lib/utils';
	import { getTitle } from '$databaseMusiconn/stores/storeEvents';

	const {
		data = [],
		title = '',
		width = $bindable(150),
		height = $bindable(150)
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
	let isSmallScreen = $derived(width < 400);

	// Calculate the actual dimensions with space for labels
	const effectiveWidth = $derived(width);
	const effectiveHeight = $derived(height * (isSmallScreen ? 0.5 : 0.6)); // Reduced height for labels
	const svgWidth = $derived(width * 1.5);
	const svgHeight = $derived(height);

	const names = $state<Record<string, string>>({});

	async function loadNames() {
		// get an array of all the ids
		const ids = data.map((item: { id: string }) => parseInt(item.id));
		await getTitle(ids, title.toLowerCase() as Entity);
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

		// Store label positions for collision detection
		const labelPositions: Array<{
			midAngle: number;
			labelX: number;
			labelY: number;
			width: number;
			height: number;
		}> = [];

		// First pass: Calculate all angles and initial positions
		const segments = data.map((item: { id: string; count: number; color: string }) => {
			const percentage = item.count / total;
			endAngle = startAngle + percentage * 2 * Math.PI;
			const midAngle = startAngle + (endAngle - startAngle) / 2;

			const result = {
				item,
				percentage,
				startAngle,
				endAngle,
				midAngle
			};

			startAngle = endAngle;
			return result;
		});

		// Draw pie segments and labels
		segments.forEach(
			(
				segment: {
					item: { id: string; count: number; color: string };
					percentage: number;
					startAngle: number;
					endAngle: number;
					midAngle: number;
				},
				index: number
			) => {
				const { item, percentage, startAngle, endAngle, midAngle } = segment;

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
				path.setAttribute('stroke-width', '2');

				if (chartArea) {
					chartArea.appendChild(path);
				}

				// Create label with connector line
				const name = names[item.id] || item.id;
				const labelText = `${name}: ${item.count} (${(percentage * 100).toFixed(1)}%)`;

				// Calculate initial position for label and connector line
				const midRadius = radius * 0.9; // Point on the pie
				let labelRadius = radius * 1.1; // Point for the label (reduced from 1.2)

				const midX = centerX + midRadius * Math.cos(midAngle);
				const midY = centerY + midRadius * Math.sin(midAngle);

				// Adjust label radius based on position to prevent labels from getting too close
				// Top and bottom segments may need more distance
				const adjustFactor = Math.abs(Math.sin(midAngle)) > 0.7 ? 1.2 : 1.0; // Reduced from 1.3
				labelRadius *= adjustFactor;

				let labelX = centerX + labelRadius * Math.cos(midAngle);
				let labelY = centerY + labelRadius * Math.sin(midAngle);

				// Estimate label dimensions - this is approximated
				const fontSize = 10;
				// Reduce the width factor to allow labels closer together horizontally
				const estimatedWidth = labelText.length * fontSize * 0.5; // Reduced from 0.6
				// Reduce the height factor to allow labels closer together vertically
				const estimatedHeight = fontSize * 1.0; // Reduced from 1.2

				// Check for collisions with previously placed labels
				let collisionDetected = true;
				let collisionAttempts = 0;
				const maxAttempts = 10;

				while (collisionDetected && collisionAttempts < maxAttempts) {
					collisionDetected = false;

					// Check against all existing labels
					for (const pos of labelPositions) {
						// Simple collision detection based on distance
						const dx = labelX - pos.labelX;
						const dy = labelY - pos.labelY;
						const distance = Math.sqrt(dx * dx + dy * dy);

						// Calculate minimum distance based on labels' sizes
						// Lower values decrease collision space (labels can be closer)
						const collisionFactor = 0.6; // Reduced from 0.75
						const minDistance = Math.max(estimatedWidth, pos.width) * collisionFactor;

						// If labels are too close, adjust this label's position
						if (distance < minDistance) {
							collisionDetected = true;

							// Increase radius slightly to move label outward
							labelRadius += radius * 0.1; // Reduced from 0.1 for finer adjustments
							labelX = centerX + labelRadius * Math.cos(midAngle);
							labelY = centerY + labelRadius * Math.sin(midAngle);
							break;
						}
					}

					collisionAttempts++;
				}

				// Store this label's final position for future collision checks
				labelPositions.push({
					midAngle,
					labelX,
					labelY,
					width: estimatedWidth,
					height: estimatedHeight
				});

				// Create connector line with potentially adjusted endpoint
				const connector = document.createElementNS('http://www.w3.org/2000/svg', 'line');
				connector.setAttribute('x1', midX.toString());
				connector.setAttribute('y1', midY.toString());
				connector.setAttribute('x2', labelX.toString());
				connector.setAttribute('y2', labelY.toString());
				connector.setAttribute('stroke', 'hsl(var(--primary))');
				connector.setAttribute('stroke-width', '2');
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
				text.textContent = labelText;
				if (labelsGroup) {
					labelsGroup.appendChild(text);
				}
			}
		);
	}
</script>

<div
	id="{title}-pie-chart"
	class="snap-center relative min-w-full flex flex-col items-center justify-center"
>
	<svg bind:this={svg} width={svgWidth} height={svgHeight}>
		<g bind:this={chartArea} transform={`translate(0, 0)`}></g>
		<g bind:this={labelsGroup} transform={`translate(0, 0)`}></g>
	</svg>
	<div
		class={cn('text-center font-bold mb-1 text-sm', {
			'absolute left-0': !isSmallScreen
		})}
	>
		{title}
	</div>
</div>
