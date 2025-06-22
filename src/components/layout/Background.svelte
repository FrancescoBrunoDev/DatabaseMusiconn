<script lang="ts">
	import { browser } from '$app/environment';

	interface Props {
		color?: string; // Primary color for the pattern
		secondaryColor?: string; // Secondary color for the pattern
		lineCount?: number; // Number of level lines
		opacity?: number; // Opacity of the lines
	}

	let {
		color = 'hsl(var(--primary))',
		secondaryColor = 'hsl(var(--primary))',
		lineCount = 40,
		opacity = 1
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = $state(null);
	let width = $state(0);
	let height = $state(0);

	// Pattern parameters with more variations
	const basePhase = 0;
	const baseAmplitude = 20;
	const baseFrequency = 0.015;

	// Arrays for variations in the pattern
	const amplitudeVariations = [1, 0.7, 1.3, 0.8, 1.2];
	const frequencyVariations = [1, 1.2, 0.8, 1.5, 0.6];
	const phaseOffsets = [0, 0.5, 1, 1.5, 2];

	// Pre-compute colors for better performance
	let computedPrimaryColor = $state('');
	let computedSecondaryColor = $state('');

	function updateComputedColors() {
		if (!browser) return;

		try {
			// Extract base colors without alpha
			const tempEl = document.createElement('div');

			// Get primary color
			tempEl.style.color = color;
			document.body.appendChild(tempEl);
			computedPrimaryColor = window.getComputedStyle(tempEl).color;

			// Get secondary color
			tempEl.style.color = secondaryColor;
			computedSecondaryColor = window.getComputedStyle(tempEl).color;

			document.body.removeChild(tempEl);
		} catch (e) {
			console.error('Error computing colors:', e);
		}
	}

	// Function to draw the pattern with more variations - optimized for performance
	function drawPattern() {
		if (!ctx) return;

		// Update colors before drawing
		updateComputedColors();

		ctx.clearRect(0, 0, width, height);

		// Enable anti-aliasing for smoother lines
		ctx.lineCap = 'round'; // Rounded line caps for smoother appearance
		ctx.lineJoin = 'round'; // Rounded line joins

		// Slight blur for a softer effect
		// ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
		// ctx.shadowBlur = 1;

		const lineSpacing = height / (lineCount - 1);

		for (let i = 0; i < lineCount; i++) {
			const y = i * lineSpacing;

			// Use different variations for each line
			const variationIndex = i % amplitudeVariations.length;
			const currentAmplitude = baseAmplitude * amplitudeVariations[variationIndex];
			const currentFrequency = baseFrequency * frequencyVariations[variationIndex];
			const currentPhase = basePhase + phaseOffsets[variationIndex];

			// Vary the pattern based on position
			const patternType = i % 3; // Three different pattern types

			// Improved line thickness calculation with reduced maximum thickness
			// Base thickness increases from top to bottom but with a lower maximum
			// Add subtle variation based on position for organic feel
			const baseThickness = 0.5 + (i / lineCount) * 1.2; // Reduced from 2.5 to 1.2 for thinner lines
			const variationFactor = Math.sin(i * 0.5) * 0.2; // Reduced variation
			const lineThickness = Math.max(0.5, Math.min(1.5, baseThickness + variationFactor)); // Set maximum thickness to 1.5
			ctx.lineWidth = lineThickness;

			// Set stroke style once per line - much faster
			const alphaValue = opacity + (i / lineCount) * 0.05;

			// Parse the pre-computed RGB values
			let strokeColor;
			const baseColor =
				i % 3 === 0
					? computedPrimaryColor
					: i % 3 === 1
						? computedSecondaryColor
						: i % 2 === 0
							? computedPrimaryColor
							: computedSecondaryColor;

			// Extract RGB components
			const rgbMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
			if (rgbMatch) {
				const r = rgbMatch[1];
				const g = rgbMatch[2];
				const b = rgbMatch[3];
				strokeColor = `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
			} else {
				strokeColor = baseColor; // Fallback
			}

			ctx.strokeStyle = strokeColor;

			// Now draw the line
			ctx.beginPath();
			ctx.moveTo(0, y);

			// Draw line with variations - higher resolution (smaller step size)
			for (let x = 0; x < width; x += 2) {
				// Reduced from 5 to 2 for higher resolution
				let waveOffset = 0;

				// Create different wave patterns based on the pattern type
				switch (patternType) {
					case 0:
						// Standard sine wave with smoother interpolation
						waveOffset = Math.sin(x * currentFrequency + currentPhase) * currentAmplitude;
						break;
					case 1:
						// Combined sine waves for more complex pattern
						waveOffset =
							Math.sin(x * currentFrequency + currentPhase) * (currentAmplitude * 0.7) +
							Math.sin(x * currentFrequency * 2 + currentPhase) * (currentAmplitude * 0.3) +
							Math.sin(x * currentFrequency * 0.5 + currentPhase * 1.5) * (currentAmplitude * 0.15); // Added third component for more detail
						break;
					case 2:
						// Smoother wave with cosine
						waveOffset = Math.cos(x * currentFrequency * 0.5 + currentPhase) * currentAmplitude;
						break;
				}

				ctx.lineTo(x, y + waveOffset);
			}

			ctx.stroke();
		}
	}

	// Handle resize using runes reactive system - with high-DPI support
	$effect(() => {
		if (!canvas || !browser) return;

		function handleResize() {
			// Get the device pixel ratio for high-DPI displays (Retina)
			const dpr = window.devicePixelRatio || 1;

			// Get the display size
			const displayWidth = window.innerWidth;
			const displayHeight = window.innerHeight;

			// Set the logical canvas size
			width = displayWidth;
			height = displayHeight;

			// Set the canvas display size
			canvas.style.width = `${displayWidth}px`;
			canvas.style.height = `${displayHeight}px`;

			// Set the scaled canvas size (for high-DPI)
			canvas.width = displayWidth * dpr;
			canvas.height = displayHeight * dpr;

			// Scale the context to match the device pixel ratio
			if (ctx) {
				ctx.scale(dpr, dpr);
			}

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

	// Redraw when theme changes (by observing CSS variables) - optimized
	$effect(() => {
		if (!browser) return;

		// Initial computation of colors
		updateComputedColors();

		// Use a debounced version of redraw to prevent too many redraws
		let debounceTimeout: ReturnType<typeof setTimeout> | undefined;

		function debouncedRedraw() {
			if (debounceTimeout) {
				clearTimeout(debounceTimeout);
			}

			debounceTimeout = setTimeout(() => {
				if (ctx) {
					updateComputedColors();
					drawPattern();
				}
			}, 100); // 100ms debounce
		}

		// Create an observer to detect theme changes
		const observer = new MutationObserver((mutations) => {
			// Check if any of the mutations affect styles/theme
			const shouldRedraw = mutations.some(
				(mutation) =>
					mutation.attributeName === 'style' ||
					mutation.attributeName === 'class' ||
					mutation.type === 'attributes'
			);

			if (shouldRedraw) {
				debouncedRedraw();
			}
		});

		// Observe the document root for class/style changes
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class', 'style']
		});

		return () => {
			if (debounceTimeout) {
				clearTimeout(debounceTimeout);
			}
			observer.disconnect();
		};
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
		z-index: -10;
		pointer-events: none;
	}
</style>
