
/* eslint-disable no-console */
import { extractMemorialData } from '../src/modules/ai';
import { submitMemorial, fetchMemorials } from '../src/modules/dataService';
import { extractXPostImage } from '../src/modules/imageExtractor';
import type { MemorialEntry } from '../src/modules/types';

/**
 * Script to automatically discover potential memorial posts on X (Twitter)
 * and add them to the Supabase database for review.
 */

const TARGETS = [
  'https://x.com/HoHossein',
  'https://x.com/LoabatK',
  'https://x.com/isamanyasin',
  'https://x.com/longlosthills',
  'https://x.com/iranwire',
  'https://x.com/HengawO',
  'https://x.com/1500tasvir',
  'https://x.com/AmnestyIran',
  'https://x.com/ICHRI',
  'https://x.com/search?q=%D8%B4%D9%87%DB%8C%D8%AF%20%D8%A7%DB%8C%D8%B1%D8%A7%D9%86&f=live', // "شهید ایران" (Martyr Iran)
  'https://x.com/search?q=%D8%AC%D8%A7%D9%86%D8%A8%D8%A7%D8%AE%D8%AA%D9%87%20%D8%A7%DB%8C%D8%B1%D8%A7%D9%86&f=live', // "جانباخته ایران" (Died Iran)
];

async function getXStatusUrls(targetUrl: string): Promise<string[]> {
  try {
    console.log(`Searching target: ${targetUrl}`);
    const readerUrl = `https://r.jina.ai/${targetUrl}`;
    const response = await fetch(readerUrl, {
      headers: { 'X-No-Cache': 'true' }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${targetUrl}: ${response.statusText}`);
      return [];
    }

    const content = await response.text();
    // Regex for X/Twitter status URLs
    const statusRegex = /https:\/\/(x|twitter)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+/g;
    const matches = content.match(statusRegex) || [];
    
    // De-duplicate and normalize to x.com
    return [...new Set(matches.map(url => url.replace('twitter.com', 'x.com')))];
  } catch (error) {
    console.error(`Error searching ${targetUrl}:`, error);
    return [];
  }
}

async function runDiscovery() {
  console.log('--- Starting X Discovery Process ---');
  
  // 1. Get already existing memorials to avoid duplicates
  const existingMemorials = await fetchMemorials(true);
  const existingUrls = new Set(
    existingMemorials.flatMap(m => [
      m.media?.xPost,
      ...(m.references?.map(r => r.url) || [])
    ]).filter(Boolean) as string[]
  );

  console.log(`Found ${existingMemorials.length} existing entries in database.`);

  // 2. Collect status URLs from all targets
  const allUrls = new Set<string>();
  for (const target of TARGETS) {
    const urls = await getXStatusUrls(target);
    urls.forEach(url => {
      if (!existingUrls.has(url)) {
        allUrls.add(url);
      }
    });
  }

  console.log(`Found ${allUrls.size} new potential status URLs.`);

  // 3. Process each new URL
  let successCount = 0;
  let skipCount = 0;

  for (const url of allUrls) {
    try {
      console.log(`Processing: ${url}`);
      
      // Extract data using AI
      const data = await extractMemorialData(url);
      
      if (!data || !data.name || data.name === 'Full Name' || data.name === '') {
        console.log(`Skipping (could not extract valid name): ${url}`);
        skipCount++;
        continue;
      }

      // Ensure we have an image
      if (!data.photo) {
        data.photo = await extractXPostImage(url) || '';
      }

      // Prepare memorial entry
      const entry: Partial<MemorialEntry> = {
        ...data,
        verified: false, // New entries from discovery are always unverified
        media: {
          xPost: url,
          photo: data.photo
        },
        references: [
          { label: data.referenceLabel || 'X Post', url: url }
        ]
      };

      // Submit to database
      const result = await submitMemorial(entry);
      
      if (result.success) {
        console.log(`Successfully added/merged: ${data.name}`);
        successCount++;
      } else {
        console.error(`Failed to submit ${data.name}: ${result.error}`);
      }

    } catch (error) {
      console.error(`Error processing ${url}:`, error);
    }
    
    // Add a small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('--- Discovery Finished ---');
  console.log(`Added/Merged: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
}

// Check if run directly
runDiscovery().catch(console.error);
