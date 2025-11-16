#!/usr/bin/env node

/**
 * Automated console script injection
 * 
 * Opens Chrome, you navigate to Perplexity Library, script auto-runs
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import readline from 'readline';

puppeteer.use(StealthPlugin());

async function autoInjectExport() {
  console.log('🚀 Automated Export with Console Script Injection\n');
  
  const userDataDir = path.resolve('./browser-data');
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: userDataDir,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--no-sandbox',
    ],
  });

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('📋 Instructions:');
  console.log('   1. Browser opened - log in to Perplexity if needed');
  console.log('   2. Navigate to your Library/Threads page');
  console.log('   3. Scroll to load threads');
  console.log('   4. Come back here and press ENTER\n');

  await page.goto('https://www.perplexity.ai');
  
  await waitForEnter();
  
  console.log('\n💉 Injecting and running export script...\n');

  // Inject the export script with progress reporting
  const result = await page.evaluate(async () => {
    const log = [];
    
    // Get all thread links from the page
    console.log('🔍 Scanning page for threads...');
    const threadElements = document.querySelectorAll('a[href*="/search/"]');
    const threads = [];
    
    threadElements.forEach((el) => {
      const href = el.href;
      const title = el.textContent?.trim() || el.getAttribute('aria-label');
      
      if (href && title && href.includes('/search/')) {
        const match = href.match(/\/search\/([^/?]+)/);
        if (match) {
          threads.push({
            id: match[1],
            title: title,
            url: href,
            slug: match[1]
          });
        }
      }
    });
    
    // Remove duplicates
    const uniqueThreads = [...new Map(threads.map(t => [t.id, t])).values()];
    
    log.push(`Found ${uniqueThreads.length} unique threads`);
    console.log(`📦 Found ${uniqueThreads.length} unique threads to export`);
    
    if (uniqueThreads.length === 0) {
      return { success: false, log, error: 'No threads found' };
    }
    
    // Fetch details for each thread
    const detailedThreads = [];
    let successCount = 0;
    let errorCount = 0;
    
    console.log('\n⬇️  Starting download...\n');
    
    for (let i = 0; i < uniqueThreads.length; i++) {
      const thread = uniqueThreads[i];
      const progress = `[${i + 1}/${uniqueThreads.length}]`;
      const percentage = Math.round(((i + 1) / uniqueThreads.length) * 100);
      
      // Truncate long titles
      const displayTitle = thread.title.length > 50 
        ? thread.title.substring(0, 47) + '...' 
        : thread.title;
      
      console.log(`${progress} ${percentage}% - ${displayTitle}`);
      log.push(`${progress} ${displayTitle}`);
      
      try {
        const response = await fetch(`https://www.perplexity.ai/rest/thread/${thread.slug}`);
        if (response.ok) {
          const data = await response.json();
          detailedThreads.push(data);
          const steps = data.steps?.length || 0;
          console.log(`          ✅ ${steps} steps downloaded`);
          log.push(`  ✅ ${steps} steps`);
          successCount++;
        } else {
          console.log(`          ⚠️  Failed (HTTP ${response.status})`);
          log.push(`  ⚠️ Failed (${response.status})`);
          detailedThreads.push(thread);
          errorCount++;
        }
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`          ❌ Error: ${error.message}`);
        log.push(`  ❌ Error: ${error.message}`);
        detailedThreads.push(thread);
        errorCount++;
      }
    }
    
    console.log(`\n✅ Download complete: ${successCount} successful, ${errorCount} errors`);
    
    return { 
      success: true, 
      log, 
      data: detailedThreads,
      count: detailedThreads.length,
      successCount,
      errorCount
    };
  });

  // Print summary with nice formatting
  console.log('\n' + '='.repeat(60));
  console.log('📊 Export Summary:');
  console.log('='.repeat(60));
  console.log(`   Total threads: ${result.count}`);
  console.log(`   ✅ Successfully exported: ${result.successCount}`);
  console.log(`   ❌ Failed: ${result.errorCount}`);
  console.log(`   📝 With full details: ${result.data.filter(t => t.steps).length}`);
  console.log('='.repeat(60));

  if (result.success) {
    
    // Ask where to save
    console.log('\n💾 Saving export...');
    const saveDir = await askSaveLocation();
    
    // Ensure directory exists
    await fs.mkdir(saveDir, { recursive: true });
    
    // Save to file
    const timestamp = Date.now();
    const filename = `perplexity-threads-${timestamp}.json`;
    const fullPath = path.join(saveDir, filename);
    
    console.log(`\n📝 Writing file...`);
    await fs.writeFile(fullPath, JSON.stringify(result.data, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ EXPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📥 Saved to: ${fullPath}`);
    console.log(`📦 File size: ${(JSON.stringify(result.data).length / 1024).toFixed(2)} KB`);
    console.log('='.repeat(60));
  } else {
    console.log(`\n❌ Export failed: ${result.error}`);
  }

  console.log('\n✅ Done! Closing browser in 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
}

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question('Press ENTER when ready... ', () => {
      rl.close();
      resolve(null);
    });
  });
}

async function askSaveLocation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    console.log('\n📁 Where would you like to save the export?');
    console.log('   1. Current folder (default)');
    console.log('   2. Home folder (~)');
    console.log('   3. Desktop');
    console.log('   4. Custom path\n');
    
    rl.question('Enter choice [1-4] (or press ENTER for current folder): ', (answer) => {
      rl.close();
      
      const choice = answer.trim() || '1';
      
      switch (choice) {
        case '1':
          resolve(process.cwd());
          break;
        case '2':
          resolve(os.homedir());
          break;
        case '3':
          resolve(path.join(os.homedir(), 'Desktop'));
          break;
        case '4':
          const rl2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          rl2.question('Enter custom path: ', (customPath) => {
            rl2.close();
            resolve(customPath.trim());
          });
          break;
        default:
          console.log('Invalid choice, using current folder');
          resolve(process.cwd());
      }
    });
  });
}

autoInjectExport().catch(console.error);
