#!/usr/bin/env node

/**
 * Quick test to see the actual Perplexity API response structure
 * Run this after navigating to your library and having a thread slug ready
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';

puppeteer.use(StealthPlugin());

async function testApiResponse() {
  console.log('🔍 Testing Perplexity API Response Structure\n');
  
  const userDataDir = path.resolve('./browser-data');
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: userDataDir,
    args: ['--disable-blink-features=AutomationControlled', '--window-size=1920,1080'],
  });

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  // Navigate to library
  console.log('📚 Navigating to Perplexity Library...');
  await page.goto('https://www.perplexity.ai/library', { waitUntil: 'networkidle2' });
  
  // Wait for threads to load
  await page.waitForTimeout(2000);
  
  // Get the first thread slug from the page
  const firstThread = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/search/"]');
    if (link) {
      const match = link.href.match(/\/search\/([^/?]+)/);
      return match ? match[1] : null;
    }
    return null;
  });
  
  if (!firstThread) {
    console.log('❌ No threads found on the page!');
    await browser.close();
    return;
  }
  
  console.log(`\n✅ Found thread slug: ${firstThread}`);
  console.log(`\n🌐 Fetching thread details from API...\n`);
  
  // Fetch the thread via API
  const result = await page.evaluate(async (slug) => {
    try {
      const response = await fetch(`https://www.perplexity.ai/rest/thread/${slug}`);
      const data = await response.json();
      
      return {
        success: true,
        status: response.status,
        data: data,
        topLevelKeys: Object.keys(data),
        dataTypes: Object.keys(data).map(key => ({
          key,
          type: Array.isArray(data[key]) ? `array[${data[key].length}]` : typeof data[key],
          sample: Array.isArray(data[key]) && data[key].length > 0 
            ? Object.keys(data[key][0] || {}).join(', ')
            : null
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }, firstThread);
  
  if (!result.success) {
    console.log(`❌ Failed to fetch thread: ${result.error}`);
    await browser.close();
    return;
  }
  
  console.log('=' .repeat(70));
  console.log('📊 API RESPONSE STRUCTURE');
  console.log('='.repeat(70));
  console.log(`\nHTTP Status: ${result.status}`);
  console.log(`\nTop-level keys: ${result.topLevelKeys.join(', ')}`);
  console.log(`\n${'Key'.padEnd(30)} Type              Sample Fields`);
  console.log('-'.repeat(70));
  
  result.dataTypes.forEach(({ key, type, sample }) => {
    const typeStr = type.padEnd(15);
    const sampleStr = sample ? sample.substring(0, 30) : '';
    console.log(`${key.padEnd(30)} ${typeStr} ${sampleStr}`);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('📝 FULL RESPONSE (first 3000 chars):');
  console.log('='.repeat(70));
  console.log(JSON.stringify(result.data, null, 2).substring(0, 3000));
  console.log('\n...(truncated)');
  console.log('='.repeat(70));
  
  // Check specifically for messages vs steps
  if (result.data.messages) {
    console.log(`\n✅ Found 'messages' field with ${result.data.messages.length} items`);
    if (result.data.messages.length > 0) {
      console.log(`\nFirst message keys: ${Object.keys(result.data.messages[0]).join(', ')}`);
    }
  }
  
  if (result.data.steps) {
    console.log(`\n✅ Found 'steps' field with ${result.data.steps.length} items`);
    if (result.data.steps.length > 0) {
      console.log(`\nFirst step keys: ${Object.keys(result.data.steps[0]).join(', ')}`);
    }
  }
  
  if (!result.data.messages && !result.data.steps) {
    console.log(`\n⚠️  WARNING: No 'messages' or 'steps' field found!`);
  }
  
  console.log('\n✅ Test complete!');
  console.log('\n💾 Saving full response to test-response.json...');
  
  // Save the full response
  await page.evaluate((data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-response.json';
    a.click();
  }, result.data);
  
  await page.waitForTimeout(2000);
  await browser.close();
}

testApiResponse().catch(console.error);
