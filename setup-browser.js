import { createStealthBrowser, PERPLEXITY_API } from './browser-config.js';

/**
 * One-time browser setup to pass Cloudflare and authenticate
 * After running this once successfully, all future runs will work
 */

async function setupBrowser() {
  console.log('🔧 Browser Setup - One-Time Configuration\n');
  console.log('This will create a persistent browser profile that saves:');
  console.log('  • Your login session');
  console.log('  • Cloudflare clearance tokens');
  console.log('  • All cookies and cache\n');
  console.log("After this setup, you won't need to deal with Cloudflare again!\n");

  const { browser, page } = await createStealthBrowser(false, true);

  console.log('🌐 Opening Perplexity...\n');
  await page.goto('https://www.perplexity.ai/signin');
  await page.waitForTimeout(3000);

  console.log('📝 Instructions:');
  console.log('   1. Complete any Cloudflare challenges if they appear');
  console.log('   2. Log in to Perplexity');
  console.log('   3. Navigate to your Library to verify everything works');
  console.log('   4. Press Ctrl+C when you see your threads/collections\n');
  console.log("⏰ Take your time - there's no rush!\n");

  // Keep browser open until user is ready
  await new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n\n✅ Setup complete!');
      console.log('📁 Browser data saved to: ./browser-data/');
      console.log('\n🚀 You can now run "Export All" and it will:');
      console.log('   • Skip Cloudflare challenges (already cleared)');
      console.log('   • Skip login (already authenticated)');
      console.log('   • Go straight to exporting your data\n');

      await browser.close();
      process.exit(0);
    });
  });
}

setupBrowser().catch(console.error);
