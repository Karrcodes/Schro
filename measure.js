const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/system/control-centre');
    await page.waitForSelector('.w-14.h-11');
    const color = await page.evaluate(() => {
        const activeBox = document.querySelector('.w-14.h-11');
        return window.getComputedStyle(activeBox).backgroundColor;
    });
    console.log("BACKGROUND:", color);
    
    // Check main Link background
    const linkColor = await page.evaluate(() => {
        const link = document.querySelector('.w-11.h-11.rounded-xl');
        return window.getComputedStyle(link).backgroundColor;
    });
    console.log("LINK BACKGROUND:", linkColor);

    await browser.close();
})();
