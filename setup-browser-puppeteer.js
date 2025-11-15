import { createStealthBrowser } from './browser-config-puppeteer.js';

async function setupBrowser() {
  console.log('🔧 Browser Setup - One-Time Configuration (Puppeteer Stealth)\n');
  console.log('This will create a persistent browser profile that saves:');
  console.log('  • Your login session');
  console.log('  • Cloudflare clearance tokens');
  console.log('  • All cookies and cache\n');
  console.log("After this setup, you won't need to deal with Cloudflare again!\n");

  const { browser, page } = await createStealthBrowser(true);

  console.log('🌐 Opening Perplexity...');
  await page.goto('https://www.perplexity.ai', { waitUntil: 'networkidle2' });

  console.log('\n📝 Instructions:');
  console.log('   1. Complete any Cloudflare challenges if they appear');
  console.log('   2. Log in to Perplexity');
  console.log('   3. Navigate to your Library to verify everything works');
  console.log('   4. Press Ctrl+C when you see your threads/collections\n');
  console.log("⏰ Take your time - there's no rush!");

  // Keep the browser open until user is done
  await new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n\n✅ Setup complete! Browser profile saved to ./browser-data/');
      console.log('   You can now run export-all-puppeteer.js without any challenges!\n');
      await browser.close();
      process.exit(0);
    });
  });
}

setupBrowser().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
