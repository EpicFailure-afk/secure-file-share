# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 08-authed-shell.spec.js >> Authed shell >> Logout clears session and returns to home
- Location: tests\e2e\08-authed-shell.spec.js:39:3

# Error details

```
TimeoutError: locator.click: Timeout 8000ms exceeded.
Call log:
  - waiting for locator('nav').getByRole('button', { name: /Logout/i })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - link "SecureShare Logo SecureShare" [ref=e6] [cursor=pointer]:
      - /url: /
      - img "SecureShare Logo" [ref=e7]
      - generic [ref=e8]: SecureShare
    - generic [ref=e9]:
      - link "Home" [ref=e10] [cursor=pointer]:
        - /url: /
      - link "Contact Us" [ref=e11] [cursor=pointer]:
        - /url: /contact
      - link "Register" [ref=e12] [cursor=pointer]:
        - /url: /register
      - link "Login" [ref=e13] [cursor=pointer]:
        - /url: /login
      - 'button "Theme: Follow system. Click to switch to Light mode." [ref=e14] [cursor=pointer]':
        - img [ref=e16]
  - main [ref=e18]:
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e23]: End-to-end encrypted
          - heading "Share files like they're yours alone" [level=1] [ref=e25]
          - paragraph [ref=e26]: SecureShare puts AES-256, expiring links, virus scanning, and integrity proofs behind one disarmingly simple workflow. No more emailing zip files and praying.
          - generic [ref=e27]:
            - link "Get started — it's free" [ref=e28] [cursor=pointer]:
              - /url: /register
              - button "Get started — it's free" [ref=e29]:
                - generic [ref=e30]: Get started — it's free
                - img [ref=e32]
            - link "I already have an account" [ref=e34] [cursor=pointer]:
              - /url: /login
              - button "I already have an account" [ref=e35]:
                - generic [ref=e36]: I already have an account
          - list [ref=e37]:
            - listitem [ref=e38]:
              - img [ref=e39]
              - text: No credit card required
            - listitem [ref=e41]:
              - img [ref=e42]
              - text: 5 GB free storage
            - listitem [ref=e44]:
              - img [ref=e45]
              - text: Self-hostable
        - generic [ref=e48]:
          - generic [ref=e53]: SecureShare · /dashboard
          - generic [ref=e54]:
            - img [ref=e56]
            - generic [ref=e58]:
              - strong [ref=e59]: q4-financials.pdf
              - generic [ref=e60]: 2.4 MB · Shared with 3 · expires in 6h 12m
            - generic [ref=e61]: Active
          - generic [ref=e63]:
            - img [ref=e65]
            - generic [ref=e67]:
              - strong [ref=e68]: backups.zip
              - generic [ref=e69]: 841 MB · Password-locked
            - generic [ref=e70]: Locked
          - generic [ref=e72]:
            - img [ref=e74]
            - generic [ref=e76]:
              - strong [ref=e77]: design-system.fig
              - generic [ref=e78]: 12 MB · Org-wide · 18 downloads
            - generic [ref=e79]: Org
      - generic [ref=e81]:
        - generic [ref=e82]:
          - generic [ref=e83]: Why teams switch
          - heading "Designed for files you don't want leaked" [level=2] [ref=e84]
          - paragraph [ref=e85]: Six things every other file-sharing tool skips. We made them the default.
        - generic [ref=e86]:
          - generic [ref=e89] [cursor=pointer]:
            - img [ref=e91]
            - heading "End-to-End Encryption" [level=3] [ref=e93]
            - paragraph [ref=e94]: AES-256 protects every file at rest and in transit. Only the people you choose can decrypt.
          - generic [ref=e97] [cursor=pointer]:
            - img [ref=e99]
            - heading "Expiring Links" [level=3] [ref=e101]
            - paragraph [ref=e102]: Set hours, days, or one-time downloads. Shares self-destruct on schedule.
          - generic [ref=e105] [cursor=pointer]:
            - img [ref=e107]
            - heading "Fast Transfers" [level=3] [ref=e109]
            - paragraph [ref=e110]: Resumable, chunked uploads with on-the-fly virus scanning. No bandwidth caps.
          - generic [ref=e113] [cursor=pointer]:
            - img [ref=e115]
            - heading "Password-Locked Files" [level=3] [ref=e117]
            - paragraph [ref=e118]: Layer an extra password on any file. Recipients prove ownership before download.
          - generic [ref=e121] [cursor=pointer]:
            - img [ref=e123]
            - heading "Organizations & Roles" [level=3] [ref=e125]
            - paragraph [ref=e126]: Five role levels, invite codes, and audit logs let you run a real team — not a free-for-all.
          - generic [ref=e129] [cursor=pointer]:
            - img [ref=e131]
            - heading "Integrity Verification" [level=3] [ref=e133]
            - paragraph [ref=e134]: SHA-256 fingerprints prove every download is byte-identical to the source.
      - generic [ref=e135]:
        - generic [ref=e136]:
          - generic [ref=e137]: How it works
          - heading "Three steps. Zero learning curve." [level=2] [ref=e138]
        - list [ref=e139]:
          - listitem [ref=e140]:
            - generic [ref=e141]: "01"
            - img [ref=e143]
            - heading "Upload" [level=4] [ref=e145]
            - paragraph [ref=e146]: Drop a file. We encrypt it before storage.
          - listitem [ref=e147]:
            - generic [ref=e148]: "02"
            - img [ref=e150]
            - heading "Share" [level=4] [ref=e152]
            - paragraph [ref=e153]: Generate a link with an expiry or a password.
          - listitem [ref=e154]:
            - generic [ref=e155]: "03"
            - img [ref=e157]
            - heading "Download" [level=4] [ref=e159]
            - paragraph [ref=e160]: Recipients verify, fetch, and we wipe on schedule.
      - generic [ref=e163]:
        - heading "Ready when you are." [level=2] [ref=e164]
        - paragraph [ref=e165]: Free forever for solo use. Org plans starting at zero dollars while we're in beta.
        - link "Create your account" [ref=e166] [cursor=pointer]:
          - /url: /register
          - button "Create your account" [ref=e167]:
            - generic [ref=e168]: Create your account
            - img [ref=e170]
  - contentinfo [ref=e172]:
    - generic [ref=e173]:
      - generic [ref=e174]:
        - link "SecureShare" [ref=e175] [cursor=pointer]:
          - /url: /
          - generic [ref=e177]: SecureShare
        - paragraph [ref=e178]: End-to-end encrypted file sharing for teams that care about privacy.
        - generic [ref=e179]:
          - link "GitHub" [ref=e180] [cursor=pointer]:
            - /url: https://github.com
            - img [ref=e181]
          - link "LinkedIn" [ref=e183] [cursor=pointer]:
            - /url: https://linkedin.com
            - img [ref=e184]
          - link "Twitter" [ref=e186] [cursor=pointer]:
            - /url: https://twitter.com
            - img [ref=e187]
      - navigation "Footer" [ref=e189]:
        - generic [ref=e190]:
          - heading "Product" [level=4] [ref=e191]
          - list [ref=e192]:
            - listitem [ref=e193]:
              - link "Features" [ref=e194] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e195]:
              - link "Pricing" [ref=e196] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e197]:
              - link "Changelog" [ref=e198] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e199]:
          - heading "Company" [level=4] [ref=e200]
          - list [ref=e201]:
            - listitem [ref=e202]:
              - link "About" [ref=e203] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e204]:
              - link "Careers" [ref=e205] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e206]:
              - link "Blog" [ref=e207] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e208]:
          - heading "Support" [level=4] [ref=e209]
          - list [ref=e210]:
            - listitem [ref=e211]:
              - link "Help Center" [ref=e212] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e213]:
              - link "Contact" [ref=e214] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e215]:
              - link "Privacy" [ref=e216] [cursor=pointer]:
                - /url: "#"
    - generic [ref=e217]:
      - paragraph [ref=e218]: © 2026 SecureShare. All rights reserved.
      - paragraph [ref=e219]:
        - text: Made with
        - img [ref=e220]
        - text: by the SecureShare team
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
  27 |     await expect(page.locator("nav").getByRole("link", { name: /Organization/i })).toBeVisible();
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
> 44 |     await page.locator("nav").getByRole("button", { name: /Logout/i }).click();
     |                                                                        ^ TimeoutError: locator.click: Timeout 8000ms exceeded.
  45 |     await expect(page).toHaveURL("http://localhost:5173/");
  46 |     const token = await page.evaluate(() => localStorage.getItem("token"));
  47 |     expect(token).toBeNull();
  48 |   });
  49 | });
  50 | 
```