<script lang="ts">
	import { browser } from '$app/environment';

	interface Props {
		color?: string; // Primary color for the pattern
		secondaryColor?: string; // Secondary color for the pattern
		lineCount?: number; // Number of level lines
		opacity?: number; // Opacity of the lines
	}

	let {
		color = 'hsl(var(--border))',
		secondaryColor = 'hsl(var(--border))',
		lineCount = 20,
		opacity = 0.2
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = $state(null);
	let width = $state(0);
	let height = $state(0);

	// Pattern parameters - static values
	const phase = 0;
	const amplitude = 20;
	const frequency = 0.02;

	// Function to draw the pattern
	function drawPattern() {
		if (!ctx) return;

		ctx.clearRect(0, 0, width, height);

		const lineSpacing = height / (lineCount - 1);

		for (let i = 0; i < lineCount; i++) {
			const y = i * lineSpacing;

			ctx.beginPath();
			ctx.moveTo(0, y);

			// Draw wavy line
			for (let x = 0; x < width; x += 5) {
				const waveOffset = Math.sin(x * frequency + phase) * amplitude;
				const lineThickness = 1 + (i / lineCount) * 2; // Thicker lines at bottom

				ctx.lineTo(x, y + waveOffset);

				// Alternate colors between lines
				if (i % 2 === 0) {
					ctx.strokeStyle = `${color}${Math.round(opacity * 255)
						.toString(16)
						.padStart(2, '0')}`;
				} else {
					ctx.strokeStyle = `${secondaryColor}${Math.round(opacity * 255)
						.toString(16)
						.padStart(2, '0')}`;
				}

				ctx.lineWidth = lineThickness;
			}

			ctx.stroke();
		}

		// No need to update animation frame here anymore
		// Animation is now handled in the dedicated $effect
	}

	// Handle resize using runes reactive system
	$effect(() => {
		if (!canvas || !browser) return;

		function handleResize() {
			width = window.innerWidth;
			height = window.innerHeight;

			canvas.width = width;
			canvas.height = height;

			drawPattern();
		}

		window.addEventListener('resize', handleResize);
		handleResize();

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	// Initialize context and draw once
	$effect(() => {
		if (browser && canvas) {
			ctx = canvas.getContext('2d');

			// Draw the pattern once the context is available and dimensions are set
			if (ctx && width > 0 && height > 0) {
				drawPattern();
			}
		}
	});
</script>

<canvas bind:this={canvas} class="background-canvas"></canvas>

<style>
	.background-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		pointer-events: none;
	}
</style>
