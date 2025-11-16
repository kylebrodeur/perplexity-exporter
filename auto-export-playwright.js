#!/usr/bin/env node

/**
 * Playwright-based automated export with full navigation
 * 
 * Features:
 * - Auto-navigates to Perplexity Library
 * - Auto-scrolls to load all threads
 * - Injects and runs export script
 * - Saves to user-selected location
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import readline from 'readline';

async function autoExportPlaywright() {
  console.log('🚀 Automated Export with Playwright\n');
  
  const userDataDir = path.resolve('./browser-data-playwright');
  
  // Launch persistent context (maintains login)
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    args: [
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('📋 Steps:');
  console.log('   1. Browser opened');
  console.log('   2. Navigating to Perplexity Library...\n');

  // Navigate to Perplexity
  await page.goto('https://www.perplexity.ai', { waitUntil: 'networkidle' });
  
  // Check if logged in by looking for library link or login button
  const isLoggedIn = await page.locator('a[href*="/library"]').count() > 0;
  
  if (!isLoggedIn) {
    console.log('⚠️  Please log in to Perplexity');
    console.log('   Press ENTER after logging in...\n');
    await waitForEnter();
  }

  // Navigate to library
  console.log('📚 Navigating to Library...');
  await page.goto('https://www.perplexity.ai/library', { waitUntil: 'domcontentloaded' });
  
  // Wait for thread links to appear
  try {
    await page.waitForSelector('a[href*="/search/"]', { timeout: 10000 });
  } catch (e) {
    console.log('⚠️  No threads found or page not loaded properly');
  }
  
  // Wait a bit for initial load
  await page.waitForTimeout(2000);

  // Add visual indicator in the browser
  await page.evaluate(() => {
    const indicator = document.createElement('div');
    indicator.id = 'scroll-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a73e8;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    indicator.textContent = '🔄 Auto-scrolling to load threads...';
    document.body.appendChild(indicator);
    
    // Highlight the scrollable container
    const scrollContainer = document.querySelector('.scrollable-container');
    if (scrollContainer) {
      scrollContainer.style.outline = '3px solid #1a73e8';
      scrollContainer.style.outlineOffset = '-3px';
    }
  });

  console.log('📜 Scrolling to load all threads...');
  console.log('   💡 This may take a while for large libraries\n');
  
  // Auto-scroll to load all threads
  let previousHeight = 0;
  let scrollAttempts = 0;
  let stableCount = 0; // Count how many times height stayed the same
  const maxScrollAttempts = 100; // Prevent infinite loop
  const stableThreshold = 3; // Need 3 stable checks to confirm done
  
  while (scrollAttempts < maxScrollAttempts) {
    // Get current scroll position, height, and thread count
    const { height, scrollTop, threadCount, visibleThreads, containerFound } = await page.evaluate(() => {
      // Find the scrollable container that holds the thread list
      const scrollContainer = document.querySelector('.scrollable-container');
      
      const allThreads = document.querySelectorAll('a[href*="/search/"]');
      const uniqueLinks = new Set();
      allThreads.forEach(el => {
        const href = el.href;
        if (href && href.includes('/search/')) {
          uniqueLinks.add(href);
        }
      });
      
      return {
        height: scrollContainer ? scrollContainer.scrollHeight : document.body.scrollHeight,
        scrollTop: scrollContainer ? scrollContainer.scrollTop : window.scrollY,
        threadCount: uniqueLinks.size,
        visibleThreads: allThreads.length,
        containerFound: !!scrollContainer
      };
    });
    
    console.log(`   📊 Scroll ${scrollAttempts + 1}: Found ${threadCount} unique threads (${visibleThreads} elements)`);
    console.log(`       Height: ${height}px, ScrollTop: ${scrollTop}px ${containerFound ? '(scrollable-container)' : '(fallback)'}`);
    
    // Update visual indicator
    await page.evaluate(({ attempt, count }) => {
      const indicator = document.getElementById('scroll-indicator');
      if (indicator) {
        indicator.innerHTML = `
          <div style="font-size: 16px; margin-bottom: 5px;">🔄 Auto-Scrolling</div>
          <div style="font-size: 13px; opacity: 0.9;">Attempt: ${attempt}</div>
          <div style="font-size: 13px; opacity: 0.9;">Threads: ${count}</div>
        `;
      }
    }, { attempt: scrollAttempts + 1, count: threadCount });
    
    if (height === previousHeight) {
      stableCount++;
      console.log(`   ⏸️  Height stable (${stableCount}/${stableThreshold})`);
      
      if (stableCount >= stableThreshold) {
        console.log(`   ✅ All threads loaded! Total: ${threadCount}\n`);
        break;
      }
    } else {
      stableCount = 0; // Reset if height changed
      console.log(`   📈 New content detected (height increased)`);
    }
    
    // Scroll to bottom - use the correct scrollable container
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('.scrollable-container');
      if (scrollContainer) {
        // Flash the container to show it's scrolling
        scrollContainer.style.outline = '3px solid #fbbf24';
        setTimeout(() => {
          scrollContainer.style.outline = '3px solid #1a73e8';
        }, 300);
        
        // Scroll the actual scrollable container
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      } else {
        // Fallback to window scroll if container not found
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    });
    
    // Wait longer for new content to load (2 seconds)
    await page.waitForTimeout(2000);
    
    previousHeight = height;
    scrollAttempts++;
  }
  
  if (scrollAttempts >= maxScrollAttempts) {
    console.log('   ⚠️  Reached max scroll attempts, continuing with loaded threads\n');
  }

  // Update indicator to show completion
  await page.evaluate(() => {
    const indicator = document.getElementById('scroll-indicator');
    if (indicator) {
      indicator.style.background = '#10b981';
      indicator.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 5px;">✅ Scrolling Complete</div>
        <div style="font-size: 13px; opacity: 0.9;">Ready to export...</div>
      `;
    }
    
    // Remove outline from container
    const scrollContainer = document.querySelector('.scrollable-container');
    if (scrollContainer) {
      scrollContainer.style.outline = 'none';
    }
    
    // Keep indicator visible for a moment before starting export
    setTimeout(() => {
      if (indicator) indicator.remove();
    }, 2000);
  });

  console.log('\n💉 Injecting and running export script...\n');

  // Wait a moment to ensure page is stable
  await page.waitForTimeout(1000);

  // Update indicator to show starting export
  await page.evaluate(() => {
    const indicator = document.getElementById('scroll-indicator');
    if (indicator) {
      indicator.style.background = '#f59e0b';
      indicator.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 5px;">⬇️ Starting Export</div>
        <div style="font-size: 13px; opacity: 0.9;">Preparing...</div>
      `;
    }
    
    // Add a console log area
    const consoleLog = document.createElement('div');
    consoleLog.id = 'export-console';
    consoleLog.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      max-width: 1000px;
      height: 500px;
      background: rgba(0, 0, 0, 0.95);
      color: #00ff00;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      flex-direction: column;
    `;
    
    // Add terminal header
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
      padding: 8px 12px;
      border-radius: 8px 8px 0 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    // Add terminal buttons
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 6px;';
    buttons.innerHTML = `
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f56;"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e;"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #27c93f;"></div>
    `;
    
    const title = document.createElement('div');
    title.style.cssText = `
      color: #c0c0c0;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    `;
    title.textContent = '📦 Perplexity Exporter Console';
    
    header.appendChild(buttons);
    header.appendChild(title);
    
    // Add content area
    const content = document.createElement('div');
    content.id = 'export-console-content';
    content.style.cssText = `
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      overflow-x: hidden;
    `;
    content.innerHTML = '<div style="color: #00ff00;">🚀 Starting export process...</div>';
    
    consoleLog.appendChild(header);
    consoleLog.appendChild(content);
    document.body.appendChild(consoleLog);
  });

  // Inject the export script with progress reporting
  const result = await page.evaluate(async () => {
    const log = [];
    
    // Helper to add to browser console
    const addToConsole = (message, color = '#00ff00') => {
      const consoleContent = document.getElementById('export-console-content');
      if (consoleContent) {
        const line = document.createElement('div');
        line.style.color = color;
        line.textContent = message;
        consoleContent.appendChild(line);
        // Auto-scroll to bottom
        consoleContent.scrollTop = consoleContent.scrollHeight;
      }
    };
    
    // Get all thread links from the page
    console.log('🔍 Scanning page for threads...');
    addToConsole('🔍 Scanning page for threads...');
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
    addToConsole(`📦 Found ${uniqueThreads.length} unique threads to export`, '#00bfff');
    
    if (uniqueThreads.length === 0) {
      addToConsole('❌ No threads found!', '#ff4444');
      return { success: false, log, error: 'No threads found' };
    }
    
    // Fetch details for each thread
    const detailedThreads = [];
    let successCount = 0;
    let errorCount = 0;
    
    console.log('\n⬇️  Starting download...\n');
    addToConsole('\n⬇️  Starting download...', '#ffaa00');
    addToConsole('━'.repeat(60), '#444444');
    
    // Update visual indicator
    const updateIndicator = (current, total, title, status = 'downloading') => {
      const indicator = document.getElementById('scroll-indicator');
      if (indicator) {
        const percentage = Math.round((current / total) * 100);
        const displayTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
        
        let statusEmoji = '⬇️';
        let statusText = 'Downloading';
        let bgColor = '#f59e0b';
        
        if (status === 'success') {
          statusEmoji = '✅';
          statusText = 'Downloaded';
          bgColor = '#10b981';
        } else if (status === 'error') {
          statusEmoji = '❌';
          statusText = 'Failed';
          bgColor = '#ef4444';
        }
        
        indicator.style.background = bgColor;
        indicator.innerHTML = `
          <div style="font-size: 16px; margin-bottom: 8px;">${statusEmoji} Exporting Threads</div>
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${percentage}%</div>
          <div style="font-size: 13px; opacity: 0.9; margin-bottom: 5px;">${current} / ${total}</div>
          <div style="font-size: 11px; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px; margin-top: 5px;">
            ${displayTitle}
          </div>
        `;
        
        // Brief flash for success/error
        if (status !== 'downloading') {
          setTimeout(() => {
            indicator.style.background = '#f59e0b';
          }, 200);
        }
      }
    };
    
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
      addToConsole(`${progress} ${percentage}% - ${displayTitle}`, '#ffffff');
      
      // Update indicator before starting - make it very visible
      updateIndicator(i + 1, uniqueThreads.length, thread.title, 'downloading');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure UI updates
      
      try {
        const response = await fetch(`https://www.perplexity.ai/rest/thread/${thread.slug}`);
        if (response.ok) {
          const data = await response.json();
          detailedThreads.push(data);
          
          // Debug: log the structure to see what we're getting
          const steps = data.steps?.length || 0;
          const hasMessages = data.messages?.length || 0;
          const keys = Object.keys(data).join(', ');
          
          console.log(`          ✅ ${steps} steps downloaded (keys: ${keys})`);
          log.push(`  ✅ ${steps} steps`);
          
          if (steps === 0 && hasMessages > 0) {
            addToConsole(`          ✅ ${hasMessages} messages (data has 'messages' not 'steps')`, '#ffaa00');
          } else if (steps > 0) {
            addToConsole(`          ✅ ${steps} steps downloaded`, '#00ff00');
          } else {
            addToConsole(`          ⚠️  No steps or messages found. Keys: ${keys}`, '#ffaa00');
          }
          
          successCount++;
          updateIndicator(i + 1, uniqueThreads.length, thread.title, 'success');
          await new Promise(resolve => setTimeout(resolve, 150)); // Show success state
        } else {
          console.log(`          ⚠️  Failed (HTTP ${response.status})`);
          log.push(`  ⚠️ Failed (${response.status})`);
          addToConsole(`          ⚠️  Failed (HTTP ${response.status})`, '#ffaa00');
          detailedThreads.push(thread);
          errorCount++;
          updateIndicator(i + 1, uniqueThreads.length, thread.title, 'error');
          await new Promise(resolve => setTimeout(resolve, 150)); // Show error state
        }
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 350));
      } catch (error) {
        console.log(`          ❌ Error: ${error.message}`);
        log.push(`  ❌ Error: ${error.message}`);
        addToConsole(`          ❌ Error: ${error.message}`, '#ff4444');
        detailedThreads.push(thread);
        errorCount++;
        updateIndicator(i + 1, uniqueThreads.length, thread.title, 'error');
        await new Promise(resolve => setTimeout(resolve, 150)); // Show error state
      }
    }
    
    console.log(`\n✅ Download complete: ${successCount} successful, ${errorCount} errors`);
    addToConsole('━'.repeat(60), '#444444');
    addToConsole(`✅ Download complete: ${successCount} successful, ${errorCount} errors`, '#00ff00');
    
    // Final indicator update
    const indicator = document.getElementById('scroll-indicator');
    if (indicator) {
      indicator.style.background = '#10b981';
      indicator.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 8px;">✅ Export Complete</div>
        <div style="font-size: 13px; opacity: 0.9;">✅ ${successCount} successful</div>
        <div style="font-size: 13px; opacity: 0.9;">❌ ${errorCount} failed</div>
        <div style="font-size: 11px; opacity: 0.8; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
          Check terminal for details
        </div>
      `;
    }
    
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
    
    // Update browser indicator for saving prompt
    await page.evaluate(() => {
      const indicator = document.getElementById('scroll-indicator');
      if (indicator) {
        indicator.style.background = '#8b5cf6';
        indicator.innerHTML = `
          <div style="font-size: 16px; margin-bottom: 5px;">💾 Save Location</div>
          <div style="font-size: 13px; opacity: 0.9;">Enter choice in console...</div>
        `;
      }
    });
    
    // Ask where to save in console UI
    console.log('\n💾 Asking for save location...');
    const saveDir = await page.evaluate(() => {
      return new Promise((resolve) => {
        const consoleContent = document.getElementById('export-console-content');
        if (!consoleContent) {
          resolve('current');
          return;
        }
        
        // Add save location prompt to console
        consoleContent.innerHTML += `
          <div style="margin-top: 20px; color: #ffaa00; font-weight: bold;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
          <div style="margin-top: 10px; color: #00bfff; font-weight: bold;">💾 Choose Save Location</div>
          <div style="margin-top: 8px; color: #aaaaaa;">Where would you like to save your Perplexity threads?</div>
          <div style="margin-top: 12px; color: #aaaaaa;">
            <div style="margin-bottom: 5px;">  [1] 📁 Current Folder (Default)</div>
            <div style="margin-bottom: 5px;">  [2] 🏠 Home Folder (~)</div>
            <div style="margin-bottom: 5px;">  [3] 🖥️  Desktop (~/Desktop)</div>
            <div style="margin-bottom: 5px;">  [4] ✏️  Custom Path</div>
          </div>
          <div style="margin-top: 12px; display: flex; align-items: center; gap: 10px;">
            <span style="color: #00ff00;">$</span>
            <span style="color: #aaaaaa;">Enter choice [1-4]:</span>
            <input 
              type="text" 
              id="save-choice-input"
              autocomplete="off"
              style="
                background: transparent;
                border: none;
                border-bottom: 2px solid #00ff00;
                color: #00ff00;
                font-family: inherit;
                font-size: inherit;
                padding: 2px 8px;
                outline: none;
                width: 60px;
                caret-color: #00ff00;
              "
            >
          </div>
          <div id="custom-path-container" style="display: none; margin-top: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #00ff00;">$</span>
              <span style="color: #aaaaaa;">Enter path:</span>
              <input 
                type="text" 
                id="custom-path-input"
                autocomplete="off"
                placeholder="/path/to/folder"
                style="
                  background: transparent;
                  border: none;
                  border-bottom: 2px solid #00ff00;
                  color: #00ff00;
                  font-family: inherit;
                  font-size: inherit;
                  padding: 2px 8px;
                  outline: none;
                  flex: 1;
                  caret-color: #00ff00;
                "
              >
            </div>
          </div>
        `;
        
        // Auto-scroll to bottom
        consoleContent.scrollTop = consoleContent.scrollHeight;
        
        // Focus the input
        const choiceInput = document.getElementById('save-choice-input');
        choiceInput.focus();
        
        // Handle choice selection
        choiceInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const choice = e.target.value.trim();
            
            // Display the chosen option in console
            const choiceDisplay = document.createElement('div');
            choiceDisplay.style.color = '#00ff00';
            choiceDisplay.style.marginTop = '5px';
            
            switch(choice) {
              case '1':
                choiceDisplay.textContent = '> Selected: Current Folder';
                consoleContent.appendChild(choiceDisplay);
                consoleContent.scrollTop = consoleContent.scrollHeight;
                resolve('current');
                break;
              case '2':
                choiceDisplay.textContent = '> Selected: Home Folder';
                consoleContent.appendChild(choiceDisplay);
                consoleContent.scrollTop = consoleContent.scrollHeight;
                resolve('home');
                break;
              case '3':
                choiceDisplay.textContent = '> Selected: Desktop';
                consoleContent.appendChild(choiceDisplay);
                consoleContent.scrollTop = consoleContent.scrollHeight;
                resolve('desktop');
                break;
              case '4':
                choiceDisplay.textContent = '> Selected: Custom Path';
                consoleContent.appendChild(choiceDisplay);
                consoleContent.scrollTop = consoleContent.scrollHeight;
                
                // Show custom path input
                const customContainer = document.getElementById('custom-path-container');
                customContainer.style.display = 'block';
                const customInput = document.getElementById('custom-path-input');
                customInput.focus();
                
                // Handle custom path input
                customInput.addEventListener('keypress', (e2) => {
                  if (e2.key === 'Enter') {
                    const customPath = e2.target.value.trim();
                    if (customPath) {
                      const pathDisplay = document.createElement('div');
                      pathDisplay.style.color = '#00ff00';
                      pathDisplay.style.marginTop = '5px';
                      pathDisplay.textContent = `> Path: ${customPath}`;
                      consoleContent.appendChild(pathDisplay);
                      consoleContent.scrollTop = consoleContent.scrollHeight;
                      resolve(customPath);
                    }
                  }
                });
                break;
              default:
                choiceDisplay.textContent = '> Invalid choice. Using Current Folder (default)';
                choiceDisplay.style.color = '#ffaa00';
                consoleContent.appendChild(choiceDisplay);
                consoleContent.scrollTop = consoleContent.scrollHeight;
                resolve('current');
            }
          }
        });
      });
    });
    
    // Convert browser choice to actual path
    let actualPath;
    switch (saveDir) {
      case 'current':
        actualPath = process.cwd();
        break;
      case 'home':
        actualPath = os.homedir();
        break;
      case 'desktop':
        actualPath = path.join(os.homedir(), 'Desktop');
        break;
      default:
        actualPath = saveDir; // Custom path
    }
    
    console.log(`   📁 Selected: ${actualPath}`);
    
    // Ensure directory exists
    await fs.mkdir(actualPath, { recursive: true });
    
    // Save to file
    const timestamp = Date.now();
    const filename = `perplexity-threads-${timestamp}.json`;
    const fullPath = path.join(actualPath, filename);
    
    console.log(`\n📝 Writing file...`);
    await fs.writeFile(fullPath, JSON.stringify(result.data, null, 2));
    
    // Add save location to console UI
    await page.evaluate(({ path }) => {
      const consoleContent = document.getElementById('export-console-content');
      if (consoleContent) {
        consoleContent.innerHTML += `
          <div style="margin-top: 15px; color: #00ff00;">✅ File saved successfully!</div>
          <div style="margin-top: 5px; color: #aaaaaa;">📁 Location: <span style="color: #00bfff;">${path}</span></div>
        `;
        consoleContent.scrollTop = consoleContent.scrollHeight;
      }
    }, { path: fullPath });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ EXPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📥 Saved to: ${fullPath}`);
    console.log(`📦 File size: ${(JSON.stringify(result.data).length / 1024).toFixed(2)} KB`);
    console.log('='.repeat(60));
    
    // Final browser indicator
    await page.evaluate(({ path, size }) => {
      const indicator = document.getElementById('scroll-indicator');
      if (indicator) {
        indicator.style.background = '#10b981';
        indicator.innerHTML = `
          <div style="font-size: 18px; margin-bottom: 8px;">✅ All Done!</div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">File saved successfully</div>
          <div style="font-size: 11px; opacity: 0.8; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; margin-top: 8px; word-break: break-all;">
            ${path}
          </div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 5px;">
            ${size} KB
          </div>
        `;
      }
    }, { 
      path: fullPath, 
      size: (JSON.stringify(result.data).length / 1024).toFixed(2) 
    });
    
  } else {
    console.log(`\n❌ Export failed: ${result.error}`);
    
    await page.evaluate(({ error }) => {
      const indicator = document.getElementById('scroll-indicator');
      if (indicator) {
        indicator.style.background = '#ef4444';
        indicator.innerHTML = `
          <div style="font-size: 16px; margin-bottom: 5px;">❌ Export Failed</div>
          <div style="font-size: 12px; opacity: 0.9;">${error}</div>
        `;
      }
    }, { error: result.error });
  }

  console.log('\n✅ Done! Closing browser in 5 seconds...');
  await page.waitForTimeout(5000);
  await context.close();
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

autoExportPlaywright().catch(console.error);
