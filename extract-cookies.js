import fs from 'fs';
import { createStealthBrowser, PERPLEXITY_API } from './browser-config.js';

async function extractCookies() {
  console.log('🍪 Cookie Extraction Tool\n');
  console.log('This will open a browser where you can log in to Perplexity.');
  console.log('After logging in, press Ctrl+C and your cookies will be saved.\n');

  const { browser, page } = await createStealthBrowser();

  console.log('🌐 Opening Perplexity...');
  await page.goto(PERPLEXITY_API.BASE_URL);

  console.log('\n📝 Instructions:');
  console.log('   1. Log in to Perplexity in the browser window');
  console.log("   2. Navigate around to make sure you're fully logged in");
  console.log('   3. Press Ctrl+C in this terminal when ready\n');

  // Wait for user to log in
  await new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n\n🍪 Extracting cookies...');

      try {
        // Get all cookies from the browser context
        const cookies = await page.context().cookies();

        // Filter to only Perplexity cookies
        const perplexityCookies = cookies.filter((cookie) =>
          cookie.domain.includes('perplexity.ai')
        );

        // Save cookies to file
        fs.writeFileSync('cookies.json', JSON.stringify(perplexityCookies, null, 2));

        console.log(`✅ Saved ${perplexityCookies.length} cookies to cookies.json`);
        console.log('\nCookie summary:');
        perplexityCookies.forEach((cookie) => {
          console.log(`   • ${cookie.name} (${cookie.domain})`);
        });

        console.log('\n✅ You can now use these cookies with export-all.js');
        console.log('   The export script will automatically detect and use cookies.json\n');
      } catch (error) {
        console.error('❌ Error extracting cookies:', error.message);
      }

      await browser.close();
      process.exit(0);
    });
  });
}

extractCookies().catch(console.error);
