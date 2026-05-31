# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 08-authed-shell.spec.js >> Authed shell >> Manager role exposes Organization + Monitoring nav pills
- Location: tests\e2e\08-authed-shell.spec.js:25:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav').getByRole('link', { name: /Organization/i })
Expected: visible
Timeout: 6000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 6000ms
  - waiting for locator('nav').getByRole('link', { name: /Organization/i })

```

```yaml
- navigation:
  - link "SecureShare Logo SecureShare":
    - /url: /
    - img "SecureShare Logo"
    - text: SecureShare
  - link "Home":
    - /url: /
  - link "Contact Us":
    - /url: /contact
  - link "Register":
    - /url: /register
  - link "Login":
    - /url: /login
  - 'button "Theme: Follow system. Click to switch to Light mode."':
    - img
- main:
  - text: End-to-end encrypted
  - heading "Share files like they're yours alone" [level=1]
  - paragraph: SecureShare puts AES-256, expiring links, virus scanning, and integrity proofs behind one disarmingly simple workflow. No more emailing zip files and praying.
  - link "Get started — it's free":
    - /url: /register
    - button "Get started — it's free":
      - text: Get started — it's free
      - img
  - link "I already have an account":
    - /url: /login
    - button "I already have an account"
  - list:
    - listitem:
      - img
      - text: No credit card required
    - listitem:
      - img
      - text: 5 GB free storage
    - listitem:
      - img
      - text: Self-hostable
  - text: Why teams switch
  - heading "Designed for files you don't want leaked" [level=2]
  - paragraph: Six things every other file-sharing tool skips. We made them the default.
  - img
  - heading "End-to-End Encryption" [level=3]
  - paragraph: AES-256 protects every file at rest and in transit. Only the people you choose can decrypt.
  - img
  - heading "Expiring Links" [level=3]
  - paragraph: Set hours, days, or one-time downloads. Shares self-destruct on schedule.
  - img
  - heading "Fast Transfers" [level=3]
  - paragraph: Resumable, chunked uploads with on-the-fly virus scanning. No bandwidth caps.
  - img
  - heading "Password-Locked Files" [level=3]
  - paragraph: Layer an extra password on any file. Recipients prove ownership before download.
  - img
  - heading "Organizations & Roles" [level=3]
  - paragraph: Five role levels, invite codes, and audit logs let you run a real team — not a free-for-all.
  - img
  - heading "Integrity Verification" [level=3]
  - paragraph: SHA-256 fingerprints prove every download is byte-identical to the source.
  - text: How it works
  - heading "Three steps. Zero learning curve." [level=2]
  - list:
    - listitem:
      - text: "01"
      - img
      - heading "Upload" [level=4]
      - paragraph: Drop a file. We encrypt it before storage.
    - listitem:
      - text: "02"
      - img
      - heading "Share" [level=4]
      - paragraph: Generate a link with an expiry or a password.
    - listitem:
      - text: "03"
      - img
      - heading "Download" [level=4]
      - paragraph: Recipients verify, fetch, and we wipe on schedule.
  - heading "Ready when you are." [level=2]
  - paragraph: Free forever for solo use. Org plans starting at zero dollars while we're in beta.
  - link "Create your account":
    - /url: /register
    - button "Create your account":
      - text: Create your account
      - img
- contentinfo:
  - link "SecureShare":
    - /url: /
  - paragraph: End-to-end encrypted file sharing for teams that care about privacy.
  - link "GitHub":
    - /url: https://github.com
    - img
  - link "LinkedIn":
    - /url: https://linkedin.com
    - img
  - link "Twitter":
    - /url: https://twitter.com
    - img
  - navigation "Footer":
    - heading "Product" [level=4]
    - list:
      - listitem:
        - link "Features":
          - /url: "#"
      - listitem:
        - link "Pricing":
          - /url: "#"
      - listitem:
        - link "Changelog":
          - /url: "#"
    - heading "Company" [level=4]
    - list:
      - listitem:
        - link "About":
          - /url: "#"
      - listitem:
        - link "Careers":
          - /url: "#"
      - listitem:
        - link "Blog":
          - /url: "#"
    - heading "Support" [level=4]
    - list:
      - listitem:
        - link "Help Center":
          - /url: "#"
      - listitem:
        - link "Contact":
          - /url: /contact
      - listitem:
        - link "Privacy":
          - /url: "#"
  - paragraph: © 2026 SecureShare. All rights reserved.
  - paragraph: Made with by the SecureShare team
```

# Test source

```ts
  1  | // 08 — Logged-in shell: navbar shows user info, role pills, dashboard reachable.
  2  | import { test, expect } from "@playwright/test";
  3  | import { mockAuthOk, loginAs } from "./helpers.js";
  4  | 
  5  | test.describe("Authed shell", () => {
  6  |   test.beforeEach(async ({ page }) => {
  7  |     await loginAs(page);
  8  |     await mockAuthOk(page, { withProfile: true });
  9  |     // Mock the data calls the Dashboard makes so it renders SOMETHING
  10 |     await page.route("**/api/files**", (route) =>
  11 |       route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ files: [] }) }),
  12 |     );
  13 |     await page.route("**/api/organization**", (route) =>
  14 |       route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ organization: null }) }),
  15 |     );
  16 |   });
  17 | 
  18 |   test("Navbar shows username + role + logout button", async ({ page }) => {
  19 |     await page.goto("/");
  20 |     await expect(page.locator("nav").getByText("e2e_user")).toBeVisible();
  21 |     await expect(page.locator("nav").getByText("(Manager)")).toBeVisible();
  22 |     await expect(page.locator("nav").getByRole("button", { name: /Logout/i })).toBeVisible();
  23 |   });
  24 | 
  25 |   test("Manager role exposes Organization + Monitoring nav pills", async ({ page }) => {
  26 |     await page.goto("/");
> 27 |     await expect(page.locator("nav").getByRole("link", { name: /Organization/i })).toBeVisible();
     |                                                                                    ^ Error: expect(locator).toBeVisible() failed
  28 |     await expect(page.locator("nav").getByRole("link", { name: /Monitoring/i })).toBeVisible();
  29 |   });
  30 | 
  31 |   test("Dashboard route mounts (no crash even with no files)", async ({ page }) => {
  32 |     await page.goto("/dashboard");
  33 |     // Whatever the heading is, the route should not show RouteFallback indefinitely
  34 |     // and should not throw to the ErrorBoundary.
  35 |     await expect(page.locator("text=Something broke on the page")).toHaveCount(0);
  36 |     await expect(page.locator("main")).toBeVisible();
  37 |   });
  38 | 
  39 |   test("Logout clears session and returns to home", async ({ page }) => {
  40 |     await page.route("**/api/auth/logout**", (route) =>
  41 |       route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }),
  42 |     );
  43 |     await page.goto("/");
  44 |     await page.locator("nav").getByRole("button", { name: /Logout/i }).click();
  45 |     await expect(page).toHaveURL("http://localhost:5173/");
  46 |     const token = await page.evaluate(() => localStorage.getItem("token"));
  47 |     expect(token).toBeNull();
  48 |   });
  49 | });
  50 | 
```