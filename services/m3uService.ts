import { StreamItem, ProfileType, Category } from '../types';

// Helper to identify stream type based on URL or metadata
const detectType = (url: string, name: string, group: string): 'live' | 'vod' | 'series' => {
  const lowerUrl = url.toLowerCase();
  const lowerGroup = group.toLowerCase();

  if (lowerGroup.includes('series') || lowerGroup.includes('season')) return 'series';
  if (lowerGroup.includes('movie') || lowerGroup.includes('vod') || lowerGroup.includes('pelicula') || lowerGroup.includes('cinema')) return 'vod';
  if (lowerUrl.endsWith('.mkv') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.avi')) return 'vod';
  
  return 'live'; // Default to live TV
};

export const fetchPlaylist = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.text();
  } catch (error) {
    console.error("Failed to fetch M3U:", error);
    // Return a dummy playlist for demonstration if CORS fails (common in browser environments without proxy)
    // In a real scenario, this would trigger a UI error asking for a proxy or file upload.
    throw error;
  }
};

/**
 * Optimized parser that filters content based on the requested ProfileType.
 * This avoids creating objects for thousands of items the user isn't looking at.
 */
export const parsePlaylistSubset = (rawM3u: string, profileType: ProfileType): Category[] => {
  const lines = rawM3u.split('\n');
  const categories: Record<string, StreamItem[]> = {};
  
  let currentItem: Partial<StreamItem> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse metadata
      // Example: #EXTINF:-1 tvg-id="" tvg-name="Channel" tvg-logo="url" group-title="News", Channel Name
      
      const groupMatch = line.match(/group-title="([^"]*)"/);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const nameParts = line.split(',');
      const name = nameParts[nameParts.length - 1].trim();
      const group = groupMatch ? groupMatch[1] : 'Uncategorized';
      const logo = logoMatch ? logoMatch[1] : undefined;

      currentItem = {
        name,
        group,
        logo
      };
    } else if (!line.startsWith('#')) {
      // This is the URL line
      if (currentItem.name) {
        const type = detectType(line, currentItem.name, currentItem.group || '');
        
        // FILTERING LOGIC: Only add if it matches the profile
        let shouldAdd = false;
        if (profileType === ProfileType.LIVE_TV && type === 'live') shouldAdd = true;
        if (profileType === ProfileType.MOVIES && type === 'vod') shouldAdd = true;
        if (profileType === ProfileType.SERIES && type === 'series') shouldAdd = true;

        if (shouldAdd) {
            const item: StreamItem = {
                id: crypto.randomUUID(),
                name: currentItem.name,
                group: currentItem.group || 'General',
                logo: currentItem.logo,
                url: line,
                type
            };

            if (!categories[item.group]) {
                categories[item.group] = [];
            }
            categories[item.group].push(item);
        }
      }
      currentItem = {}; // Reset
    }
  }

  // Convert map to array and sort
  return Object.keys(categories)
    .sort()
    .map(groupName => ({
      name: groupName,
      items: categories[groupName]
    }));
};
