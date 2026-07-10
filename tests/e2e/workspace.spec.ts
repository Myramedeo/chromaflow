import { test, expect } from '@playwright/test';

test('creates a workspace from the dashboard shell', async ({ page }) => {
  const workspaceName = `E2E Workspace ${Date.now()}`;
  const workspaceSlug = `e2e-workspace-${Date.now()}`;

  await page.goto('/dashboard');
  await expect(page.getByText('Workspaces')).toBeVisible();

  const response = await page.evaluate(async ({ name, slug }) => {
    const res = await window.fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });

    return {
      status: res.status,
      body: await res.json(),
    };
  }, { name: workspaceName, slug: workspaceSlug });

  expect(response.status).toBe(201);
  expect(response.body.name).toBe(workspaceName);
  expect(response.body.slug).toBe(workspaceSlug);
});
