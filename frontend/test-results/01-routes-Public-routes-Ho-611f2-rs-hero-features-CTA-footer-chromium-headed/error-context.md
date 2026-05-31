# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-routes.spec.js >> Public routes >> Home renders hero + features + CTA + footer
- Location: tests\e2e\01-routes.spec.js:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Expiring Links')
Expected: visible
Error: strict mode violation: getByText('Expiring Links') resolved to 2 elements:
    1) <p class="_heroSubtitle_w37mz_49">SecureShare puts AES-256, expiring links, virus s…</p> aka getByText('SecureShare puts AES-256,')
    2) <h3 class="_featureTitle_w37mz_211">Expiring Links</h3> aka getByRole('heading', { name: 'Expiring Links' })

Call log:
  - Expect "toBeVisible" with timeout 6000ms
  - waiting for getByText('Expiring Links')

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
  1  | // 01 — Every public route resolves and renders its key landmarks.
  2  | import { test, expect } from "@playwright/test";
  3  | import { mockAuthOk, mockShareInvalid } from "./helpers.js";
  4  | 
  5  | test.describe("Public routes", () => {
  6  |   test.beforeEach(async ({ page }) => {
  7  |     await mockAuthOk(page);
  8  |   });
  9  | 
  10 |   test("Home renders hero + features + CTA + footer", async ({ page }) => {
  11 |     await page.goto("/");
  12 |     await expect(page.getByRole("heading", { name: /Share files like/i })).toBeVisible();
  13 |     await expect(page.getByText("Designed for files you don't want leaked")).toBeVisible();
  14 |     await expect(page.getByText("Three steps. Zero learning curve.")).toBeVisible();
  15 |     await expect(page.getByText("Ready when you are.")).toBeVisible();
  16 |     await expect(page.getByText("End-to-End Encryption")).toBeVisible();
> 17 |     await expect(page.getByText("Expiring Links")).toBeVisible();
     |                                                    ^ Error: expect(locator).toBeVisible() failed
  18 |     await expect(page.getByText("Fast Transfers")).toBeVisible();
  19 |     await expect(page.locator("footer").getByText(/Product/i)).toBeVisible();
  20 |   });
  21 | 
  22 |   test("Login route shows two-step glass card", async ({ page }) => {
  23 |     await page.goto("/login");
  24 |     await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  25 |     await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  26 |     await expect(page.getByText("Step 1 of 2")).toBeVisible();
  27 |     await expect(page.getByRole("button", { name: /^Continue$/ })).toBeVisible();
  28 |   });
  29 | 
  30 |   test("Register route shows wide auth card", async ({ page }) => {
  31 |     await page.goto("/register");
  32 |     await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  33 |     await expect(page.getByLabel(/Username/)).toBeVisible();
  34 |     await expect(page.getByRole("button", { name: /Create organization/i })).toBeVisible();
  35 |     await expect(page.getByRole("button", { name: /Join organization/i })).toBeVisible();
  36 |   });
  37 | 
  38 |   test("ForgotPassword route shows step 1 reset form", async ({ page }) => {
  39 |     await page.goto("/forgot-password");
  40 |     await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  41 |     await expect(page.getByRole("button", { name: /Send verification code/i })).toBeVisible();
  42 |   });
  43 | 
  44 |   test("Contact route shows info card + form card", async ({ page }) => {
  45 |     await page.goto("/contact");
  46 |     await expect(page.getByRole("heading", { name: /We're a message away/i })).toBeVisible();
  47 |     await expect(page.getByText("Get in touch")).toBeVisible();
  48 |     await expect(page.getByText("Send us a message")).toBeVisible();
  49 |     await expect(page.getByText("support@secureshare.com")).toBeVisible();
  50 |   });
  51 | 
  52 |   test("Styleguide route renders all section headers", async ({ page }) => {
  53 |     await page.goto("/styleguide");
  54 |     await expect(page.getByRole("heading", { name: "Design System Styleguide" })).toBeVisible();
  55 |     for (const section of [
  56 |       "Typography", "Color tokens", "Button", "IconButton",
  57 |       "Inputs · FormField", "Badge", "Card", "Skeleton & Spinner",
  58 |       "Divider", "EmptyState", "Modal & Toast",
  59 |     ]) {
  60 |       await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
  61 |     }
  62 |   });
  63 | 
  64 |   test("Share with invalid token shows EmptyState fallback", async ({ page }) => {
  65 |     await mockShareInvalid(page);
  66 |     await page.goto("/share/invalid-token-abc");
  67 |     await expect(page.getByText("File not available")).toBeVisible();
  68 |     await expect(page.getByRole("link", { name: /Go to homepage/i })).toBeVisible();
  69 |   });
  70 | 
  71 |   test("Unknown route still renders shell (no crash)", async ({ page }) => {
  72 |     await page.goto("/this-route-does-not-exist");
  73 |     // App shell is up: navbar + footer should be present
  74 |     await expect(page.locator("nav")).toBeVisible();
  75 |     await expect(page.locator("footer")).toBeVisible();
  76 |   });
  77 | });
  78 | 
```