const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('pageerror', error => {
        console.log('CRASH ERROR:', error.message);
    });
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('CONSOLE ERROR:', msg.text());
        }
    });

    await page.goto('http://localhost:5173');
    // wait for render
    await new Promise(r => setTimeout(r, 2000));

    console.log('Done test');
    await browser.close();
})();
