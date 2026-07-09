import { test, expect } from '@playwright/test';

test('loads the app and redirects unauthenticated users to sign-in', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.locator('main')).toBeVisible();
});
