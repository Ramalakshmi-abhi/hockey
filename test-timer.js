import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  let hasReactWarning = false;
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      console.log('BROWSER ERROR:', text);
      if (text.includes('Cannot update a component') && text.includes('Timer')) {
        hasReactWarning = true;
      }
    }
  });

  console.log('Navigating to match page...');
  await page.goto('http://localhost:5175/match/-OoixkFEbEdH1rfnS9y1', { waitUntil: 'networkidle2' });
  
  console.log('Looking for Start button...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const startBtn = btns.find(b => b.textContent.includes('Start'));
    if (startBtn) {
      startBtn.click();
      return true;
    }
    return false;
  });
  
  if (clicked) {
    console.log('Clicking Start button...');
    await new Promise(r => setTimeout(r, 4000));
  } else {
    console.log('Start button not found.');
  }

  console.log('Result: Has React Warning?', hasReactWarning);
  
  await browser.close();
})();
