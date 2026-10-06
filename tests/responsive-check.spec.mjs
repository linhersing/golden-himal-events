import { expect, test } from '@playwright/test';

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-primary-action]')).toBeVisible();
});

test('tablet cards do not overlap', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');

  const boxes = await page.locator('.venue-card').evaluateAll((cards) => cards.map((card) => {
    const box = card.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }));

  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(768);
  }

  for (let first = 0; first < boxes.length; first += 1) {
    for (let second = first + 1; second < boxes.length; second += 1) {
      const a = boxes[first];
      const b = boxes[second];
      const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      expect(overlaps).toBe(false);
    }
  }
});

test('desktop hero and primary action are visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('.identity-card img')).toBeVisible();
  await expect(page.locator('[data-primary-action]')).toBeVisible();
});

test('registration control announces preview status without a request', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const outgoing = [];
  page.on('request', (request) => outgoing.push(request.url()));

  await page.locator('[data-registration-preview]').click();
  await expect(page.locator('[data-registration-status]')).toHaveText('Registration is not open yet. Updates will appear here.');
  expect(outgoing).toEqual([]);
});
