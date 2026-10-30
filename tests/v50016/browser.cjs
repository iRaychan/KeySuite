const assert = require('assert');
const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.KEYSUITE_TEST_URL || 'http://127.0.0.1:8270/';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.KeySuiteCategories && window.KeySuiteV3944Categories);

    await page.evaluate(() => {
      window.KEYSUITE_ACCESS = { role: 'owner', display_name: 'Phase 3 Browser Test' };
      window.KeySuitePermissions = { level: () => 'full' };
      window.KEYSUITE_SECURE_DATA = {
        ...(window.KEYSUITE_SECURE_DATA || {}),
        categories: [
          {
            id: 'phase3-browser-category',
            name: 'Phase 3 Browser Category',
            active: true,
            productRules: {}
          }
        ]
      };
      window.KeySuiteCategories.init(null, window.KEYSUITE_ACCESS);
      window.KeySuiteCategories.render();
    });

    const editButton = page.locator('#editCategoryList');
    assert.strictEqual((await editButton.textContent()).trim(), 'Edit');

    await editButton.dispatchEvent('pointerdown', { pointerType: 'mouse', button: 0 });
    await page.waitForTimeout(1150);
    assert.strictEqual((await editButton.textContent()).trim(), '4');
    await editButton.dispatchEvent('pointerup', { pointerType: 'mouse', button: 0 });
    assert.strictEqual((await editButton.textContent()).trim(), 'Edit');
    assert.strictEqual(
      await editButton.evaluate((node) => node.closest('.card').classList.contains('category-list-unlocked')),
      false
    );

    await editButton.dispatchEvent('pointerdown', { pointerType: 'mouse', button: 0 });
    await page.waitForTimeout(5200);
    assert.strictEqual((await editButton.textContent()).trim(), 'Done');
    assert.strictEqual(
      await editButton.evaluate((node) => node.closest('.card').classList.contains('category-list-unlocked')),
      true
    );
    await editButton.dispatchEvent('pointerup', { pointerType: 'mouse', button: 0 });
    await editButton.dispatchEvent('click');
    assert.strictEqual((await editButton.textContent()).trim(), 'Edit');
    assert.strictEqual(
      await editButton.evaluate((node) => node.closest('.card').classList.contains('category-list-unlocked')),
      false
    );

    await page.evaluate(() => window.KeySuiteV3944Categories.setMode('compare'));
    const productTabs = page.locator('#ks3942ProductTabs button');
    assert.strictEqual(await productTabs.count(), 13);
    const fontWeights = await productTabs.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).fontWeight)
    );
    assert(fontWeights.every((weight) => weight === '700'), `Unexpected tab weights: ${fontWeights.join(', ')}`);

    console.log('PASS v5.00.16 browser regression: category hold/release/unlock/done and 13 bold tabs');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
