import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 1. Check Light Mode
  await page.goto('http://localhost:5173/career');
  await page.waitForTimeout(2000);
  
  const lightBg = await page.evaluate(() => {
    const el = document.querySelector('.bg-mainBg');
    if (!el) return 'Not found';
    return window.getComputedStyle(el).backgroundColor;
  });
  
  // 2. Check Dark Mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(1000);
  
  const darkBg = await page.evaluate(() => {
    const el = document.querySelector('.bg-mainBg');
    if (!el) return 'Not found';
    return window.getComputedStyle(el).backgroundColor;
  });
  
  console.log(`Light Mode bg-mainBg: ${lightBg}`);
  console.log(`Dark Mode bg-mainBg: ${darkBg}`);
  
  await browser.close();
}

run().catch(console.error);
