const { chromium } = require('playwright');

// Fetch dynamic content from a webpage (e.g. LinkedIn) using a headless
// browser. Random delays and user-agent rotation should be applied to avoid
// detection.
async function fetchDynamicContent(url) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  ];

  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent });

  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    // Random delay between 1 and 3 seconds to mimic human behaviour
    const delay = 1000 + Math.floor(Math.random() * 2000);
    await page.waitForTimeout(delay);

    return await page.content();
  } finally {
    await browser.close();
  }
}

module.exports = { fetchDynamicContent };
