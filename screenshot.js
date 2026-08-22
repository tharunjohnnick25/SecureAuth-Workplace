const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  
  // Navigate to login
  await page.goto('http://localhost:3000/login');
  
  // Click on the Admin login option
  await page.click('text="Company admin"');
  await page.waitForTimeout(1000); // Wait for transition
  
  // Inject mobile styles to emulate the WebView
  await page.addStyleTag({ content: `
      aside { display: none !important; }
      nav { display: none !important; }
      header { display: none !important; }
      .lg\\:ml-64 { margin-left: 0 !important; }
      .pt-16, .pt-24, .pt-20 { padding-top: 10px !important; }
      main { padding-bottom: 90px !important; padding-left: 10px !important; padding-right: 10px !important; }
  `});
  
  await page.screenshot({ path: 'mobile-login.png', fullPage: true });

  await browser.close();
  console.log("Screenshot saved to mobile-login.png");
})();
