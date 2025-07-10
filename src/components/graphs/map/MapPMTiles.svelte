<script lang="ts">
	// PMTiles map implementation using MapLibre GL and Protomaps
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import * as pmtiles from 'pmtiles';
	import { GRAYSCALE, layers } from '@protomaps/basemaps';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface Props {
		data: { name: string | undefined; geometries: { geo: number[] }[] }[];
	}

	let { data }: Props = $props();

	// DOM element for the map
	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map;
	// Track hovered point ID to show/hide labels
	let hoveredPointId: string | null = null;
	// Store MapLibre markers for tooltips
	let labelMarkers: Record<string, maplibregl.Marker> = {};
	// Track added point sources and layers for cleanup
	let addedSources: string[] = [];
	let addedLayers: string[] = [];
	// Store all point IDs for hover effects
	let allPointIds: string[] = [];

	let width = $state(800);
	let height = $state(300);

	// Calculate center point from data, similar to Maps.svelte
	const validPoints = $derived(
		data
			.filter((d: { geometries: { geo: any }[] }) => d.geometries?.[0]?.geo)
			.map((d: { geometries: { geo: any }[] }) => d.geometries[0].geo)
	);

	const centerPoint = $derived(
		validPoints.reduce(
			(acc: { lat: number; lng: number }, curr: number[]) => {
				return {
					lat: acc.lat + curr[0] / validPoints.length,
					lng: acc.lng + curr[1] / validPoints.length
				};
			},
			{ lat: 0, lng: 0 }
		)
	);

	// Set up PMTiles protocol
	const setupPMTilesProtocol = () => {
		const protocol = new pmtiles.Protocol();
		maplibregl.addProtocol('pmtiles', protocol.tile);
		return protocol;
	};

	// State to track loading and error status
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let mapInitialized = $state(false);

	// Fetch presigned URL for PMTiles file
	async function getPresignedUrl() {
		try {
			const response = await fetch(
				'/api/map/presigned-url?bucket=protomaps&object=20250620.pmtiles'
			);
			if (!response.ok) {
				throw new Error(`Failed to get presigned URL: ${response.statusText}`);
			}
			const data = await response.json();
			return data.url;
		} catch (err) {
			console.error('Error fetching presigned URL:', err);
			loadError = 'Could not load map tiles: authentication failed';
			throw err;
		}
	}

	// Initialize map with base layers
	async function initializeMap() {
		if (mapInitialized || !mapContainer) return;

		const protocol = setupPMTilesProtocol();
		isLoading = true;

		try {
			// Get the authenticated presigned URL
			const pmtilesUrl = await getPresignedUrl();

			// Create a style using the GRAYSCALE flavor and our PMTiles source
			const style: maplibregl.StyleSpecification = {
				version: 8 as 8,
				glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
				sources: {
					protomaps: {
						type: 'vector',
						url: `pmtiles://${pmtilesUrl}`,
						attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
					}
				},
				layers: layers('protomaps', GRAYSCALE)
			};

			// Initialize the map with the proper Protomaps style
			map = new maplibregl.Map({
				container: mapContainer,
				style: style,
				center: validPoints.length > 0 ? [centerPoint.lng, centerPoint.lat] : [7.626135, 51.962944],
				zoom: 12,
				maxZoom: 16, // Set maximum zoom level
				attributionControl: false,
				transformRequest: (url, resourceType) => {
					// Log which resources are being requested
					console.debug(`MapLibre requesting: ${resourceType} - ${url}`);
					return { url };
				}
			});

			// After the map loads, add markers for data points
			map.on('load', () => {
				mapInitialized = true;
				updateMapData();
			});

			// Handle map errors
			map.on('error', (e) => {
				console.error('Map error:', e);
				loadError = 'Error loading map: ' + (e.error?.message || 'Unknown error');
				isLoading = false;
			});
		} catch (err) {
			console.error('Error setting up map:', err);
			loadError = err instanceof Error ? err.message : 'Failed to initialize map';
			isLoading = false;
		}
	}

	// Update map with new data points
	function updateMapData() {
		if (!map || !mapInitialized) return;

		// Clean up previous markers
		cleanupPreviousData();

		// Use the already calculated valid points and enrich them with name
		const pointsWithNames = data
			.filter((d) => d.geometries?.[0]?.geo)
			.map((d) => ({
				name: d.name,
				coordinates: [d.geometries[0].geo[1], d.geometries[0].geo[0]] // [lng, lat]
			}));

		// Reset the point IDs array
		allPointIds = [];

		// Add each point as a simple black dot with a label
		pointsWithNames.forEach((point) => {
			// Create a unique ID for this point
			const pointId = `point-${(point.name || 'unnamed').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
			const labelId = `label-${pointId}`;

			// Track added sources and layers for later cleanup
			addedSources.push(pointId, labelId);
			addedLayers.push(pointId, labelId);
			// Store this point ID for hover effects
			allPointIds.push(pointId);

			// Add a simple black dot as a circle layer with source
			const pointSource = {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'Point',
						coordinates: point.coordinates
					}
				}
			};

			map.addSource(pointId, pointSource as any);

			// Add point layer
			map.addLayer({
				id: pointId,
				type: 'circle',
				source: pointId,
				paint: {
					'circle-radius': 6,
					'circle-color': '#000000', // Simple black dot
					'circle-stroke-width': 0
				}
			});

			// Add text label source
			map.addSource(labelId, {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {
						name: (point.name || 'unnamed').split(' ').slice(0, 3).join(' ')
					},
					geometry: {
						type: 'Point',
						coordinates: point.coordinates
					}
				}
			} as any);

			// Add text label layer (initially invisible)
			// Create a CSS-styled label as a MapLibre marker
			const labelElement = document.createElement('div');
			labelElement.className = 'map-label';
			labelElement.textContent = (point.name || 'unnamed').split(' ').slice(0, 3).join(' ');
			labelElement.style.display = 'none'; // Initially hidden

			// Create a MapLibre marker for the tooltip
			const marker = new maplibregl.Marker({
				element: labelElement,
				anchor: 'bottom-left',
				offset: [10, -10] // Offset to position tooltip near the point
			})
				.setLngLat(point.coordinates as [number, number])
				.addTo(map);

			// Store reference for hover events
			labelMarkers[pointId] = marker;

			// Add text layer (as fallback - will be invisible)
			map.addLayer({
				id: labelId,
				type: 'symbol',
				source: labelId,
				layout: {
					'text-field': ['get', 'name'],
					'text-font': ['Noto Sans Regular'],
					'text-size': 0, // Size zero to be invisible
					visibility: 'none'
				},
				paint: {
					'text-color': '#000000'
				}
			});

			// Add hover events for this point
			map.on('mouseenter', pointId, () => {
				hoveredPointId = pointId;
				// Show the marker's DOM element
				if (labelMarkers && labelMarkers[pointId]) {
					const markerElement = labelMarkers[pointId].getElement();
					if (markerElement) {
						markerElement.style.display = 'block';
					}
				}
				// Update all points: enlarge hovered point, shrink others
				allPointIds.forEach((id) => {
					if (id === pointId) {
						// Enlarge the hovered point
						map.setPaintProperty(id, 'circle-radius', 10);
					} else {
						// Shrink all other points
						map.setPaintProperty(id, 'circle-radius', 4);
					}
				});
			});

			map.on('mouseleave', pointId, () => {
				hoveredPointId = null;
				// Hide the marker's DOM element
				if (labelMarkers && labelMarkers[pointId]) {
					const markerElement = labelMarkers[pointId].getElement();
					if (markerElement) {
						markerElement.style.display = 'none';
					}
				}
				// Reset all points back to normal size
				allPointIds.forEach((id) => {
					map.setPaintProperty(id, 'circle-radius', 8);
				});
			});
		});

		// Fit bounds to include all markers if we have valid points
		if (pointsWithNames.length > 0) {
			const bounds = new maplibregl.LngLatBounds();
			pointsWithNames.forEach((point) => {
				bounds.extend(point.coordinates as [number, number]);
			});
			map.fitBounds(bounds, { padding: 50 });
		}

		isLoading = false;
	}

	// Clean up previous data layers, sources, and markers
	function cleanupPreviousData() {
		// Remove previous layers
		addedLayers.forEach((layerId) => {
			if (map.getLayer(layerId)) {
				map.removeLayer(layerId);
			}
		});

		// Remove previous sources
		addedSources.forEach((sourceId) => {
			if (map.getSource(sourceId)) {
				map.removeSource(sourceId);
			}
		});

		// Remove previous markers
		Object.keys(labelMarkers).forEach((markerId) => {
			if (labelMarkers[markerId]) {
				labelMarkers[markerId].remove();
				delete labelMarkers[markerId];
			}
		});

		// Reset tracking arrays
		addedLayers = [];
		addedSources = [];
		labelMarkers = {};
		allPointIds = [];
	}

	// Initialize map on mount
	onMount(async () => {
		await initializeMap();
	});

	// Watch for data changes and update the map
	$effect(() => {
		// Using data in the effect makes it automatically track this dependency
		if (mapInitialized && map && data) {
			updateMapData();
		}
	});

	onDestroy(() => {
		if (map) {
			cleanupPreviousData();
			map.remove();
		}
	});
</script>

<div
	class="loader w-11/12 max-w-3xl overflow-hidden rounded-xl"
	class:loaded={!isLoading && data.length > 0}
	class:loading={isLoading || data.length === 0}
	bind:clientWidth={width}
	style="height: {height}px;"
>
	{#if isLoading}
		<div
			class="bg-background absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center"
		>
			<div class="loader-spinner"></div>
		</div>
	{/if}

	{#if loadError}
		<div
			class="bg-background absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center p-4 text-center"
		>
			<p class="font-medium text-red-600">{loadError}</p>
		</div>
	{/if}

	<div bind:this={mapContainer} style="width: 100%; height: 100%;"></div>
</div>

<style lang="postcss">
	@reference '$tailwind';
	/* Simple styling for the map container */

	.loader-spinner {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 3px solid rgba(0, 0, 0, 0.1);
		border-top-color: #000;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Custom styling for map labels */
	:global(.map-label) {
		@apply bg-background text-text rounded-xl px-2 py-1 text-sm whitespace-nowrap drop-shadow-2xl;
		font-family: 'Outfit', sans-serif; /* Using your Google Font */
	}
</style>
