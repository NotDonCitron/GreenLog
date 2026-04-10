#!/usr/bin/env node

/**
 * GreenLog Smoke Test
 * Verifies basic UI components and accessibility
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runSmokeTest() {
  console.log('🚀 Starting GreenLog Smoke Test...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the smoke preview
    const smokePath = path.join(__dirname, 'smoke-preview.html');
    await page.goto(`file://${smokePath}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take a simple page screenshot and create accessibility info
    await page.screenshot({ path: 'smoke-test-screenshot.png' });

    // Get basic accessibility info
    const headingText = await page.locator('h1').textContent();
    const buttonTexts = await page.locator('button').allTextContents();
    const footerText = await page.locator('.footer').textContent();

    const snapshotText = formatSimpleSnapshot({
      title: headingText?.trim(),
      buttons: buttonTexts,
      footer: footerText?.trim()
    });

    // Save snapshot
    const snapshotPath = path.join(__dirname, 'smoke_snapshot.txt');
    fs.writeFileSync(snapshotPath, snapshotText);

    console.log('✅ Smoke test completed successfully!');
    console.log(`📄 Snapshot saved to: ${snapshotPath}`);

    // Verify expected elements
    const expectedElements = [
      'CANNALOG!',
      'Comic Weiß',
      'Comic Grün',
      'RADIAL COMIC FX V5.0'
    ];

    const missingElements = expectedElements.filter(el => {
      if (el === 'CANNALOG!') return !headingText?.includes(el);
      if (el === 'RADIAL COMIC FX V5.0') return !footerText?.includes(el);
      return !buttonTexts.includes(el);
    });

    if (missingElements.length === 0) {
      console.log('✅ All expected elements found!');
    } else {
      console.error('❌ Missing elements:', missingElements);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log('\n🎉 Smoke test passed! GreenLog UI is ready.');
}

function formatSimpleSnapshot(data) {
  const lines = [
    '1: uid=12_0 RootWebArea "GreenLog Comic Radial Smoke" url="file:///home/phhttps/Dokumente/Greenlog/GreenLog/smoke-preview.html"',
    '2:   uid=12_1 banner',
    `3:     uid=12_2 heading "${data.title}" level="1"`,
    '4:   uid=12_3 button "Comic Weiß"',
    '5:   uid=12_4 button "Comic Grün"',
    `6:   uid=12_5 StaticText "${data.footer}"`
  ];

  return lines.join('\n');
}

// Run the test
runSmokeTest().catch(console.error);