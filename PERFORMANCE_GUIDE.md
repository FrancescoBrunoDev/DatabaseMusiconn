# Performance Optimization Guide for DatabaseMusiconn Caching

## Summary of Improvements

I've implemented several performance optimizations for your title caching system:

### 1. **Persistent Caching**

- Titles are now cached in localStorage and persist across page reloads
- Cache expires after 24 hours and has versioning support
- Automatic cache initialization on module load

### 2. **Improved Loading States**

- Prevents duplicate API requests for the same data
- Tracks failed requests to avoid immediate retries
- Better error handling with exponential backoff

### 3. **Synchronous Access**

- `getTitleString()` now returns cached data immediately
- `getTitleStringAsync()` for cases where you need to wait for network requests
- Reduced component re-renders and improved UI responsiveness

### 4. **Bulk Operations**

- `preloadTitlesForEvents()` for efficient batch loading
- Reduced API calls through better batching strategies

## Usage Guide

### For Components Currently Using `{#await getTitleString(...)}`

**Before (slow):**

```svelte
{#await getTitleString(performance.work, 'work') then title}
    <span>{title}</span>
{/await}
```

**After (fast):**

```svelte
<script>
    // Import both versions
    import { getTitleString, getTitleStringAsync } from '$databaseMusiconn/stores/storeEvents';

    // Option 1: Use synchronous version (immediate, may show "Loading...")
    $: workTitle = getTitleString(performance.work, 'work');
</script>

<span>{workTitle}</span>

<!-- OR Option 2: Still use async if you prefer to wait -->
{#await getTitleStringAsync(performance.work, 'work') then title}
    <span>{title}</span>
{/await}
```

### For Bulk Loading (Best Performance)

**In your main data loading functions:**

```javascript
import { preloadTitlesForEvents, fetchedEvents } from '$databaseMusiconn/stores/storeEvents';

// After loading events, preload all titles
async function loadEventData() {
	const events = await fetchEvents(); // your existing fetch

	// Preload all titles in the background
	preloadTitlesForEvents(events);

	fetchedEvents.set(events);
}
```

### For Debugging and Monitoring

```javascript
import { getCacheStats, clearFailedCache } from '$databaseMusiconn/stores/storeEvents';

// Check cache performance
console.log('Cache stats:', getCacheStats());

// Clear failed requests cache (for retry mechanisms)
clearFailedCache();
```

## Component Migration Examples

### EventPerformances.svelte

```svelte
<script>
    import { getTitleString } from '$databaseMusiconn/stores/storeEvents';

    export let event;

    // Get all titles synchronously
    $: performances = event.performances.map(perf => ({
        ...perf,
        workTitle: getTitleString(perf.work, 'work')
    }));
</script>

{#each performances as performance, index}
    <div>
        <span class="font-bold">{toRoman(index + 1)}</span>. {performance.workTitle}
        <EventPerformancesPersons {performance} />
    </div>
{/each}
```

### Event.svelte

```svelte
<script>
    import { getTitleString } from '$databaseMusiconn/stores/storeEvents';

    export let event;

    // Get location and corporation titles synchronously
    $: locations = event.locations?.map(loc => ({
        ...loc,
        title: getTitleString(loc.location, 'location')
    })) || [];

    $: corporations = event.corporations?.map(corp => ({
        ...corp,
        title: getTitleString(corp.corporation, 'corporation')
    })) || [];
</script>

<!-- Render immediately without await blocks -->
{#each locations as location}
    <span>{location.title}</span>
{/each}

{#each corporations as corporation}
    <span>{corporation.title}</span>
{/each}
```

## Expected Performance Improvements

1. **Faster Initial Load**: Persistent cache means no re-fetching on page reload
2. **Immediate UI Updates**: Synchronous access eliminates loading states for cached data
3. **Reduced API Calls**: Better duplicate prevention and batch loading
4. **Better User Experience**: Less "Loading..." flickering, more responsive interface

## Migration Steps

1. **Update imports**: Add `getTitleStringAsync`, `preloadTitlesForEvents` where needed
2. **Replace await blocks**: Convert `{#await getTitleString(...)}` to synchronous reactive statements
3. **Add preloading**: Call `preloadTitlesForEvents()` after loading event data
4. **Test thoroughly**: Verify that titles appear correctly and check browser dev tools for reduced network requests

The system will automatically fall back gracefully - if data isn't cached, it shows "Loading..." and fetches in the background, updating the UI when ready.
