# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-routes.spec.js >> Public routes >> Unknown route still renders shell (no crash)
- Location: tests\e2e\01-routes.spec.js:71:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav')
Expected: visible
Error: strict mode violation: locator('nav') resolved to 2 elements:
    1) <nav class="_navbar_1ef7d_1 ">…</nav> aka getByText('SecureShareHomeContact')
    2) <nav aria-label="Footer" class="_linksGrid_1dle3_91">…</nav> aka getByRole('navigation', { name: 'Footer' })

Call log:
  - Expect "toBeVisible" with timeout 6000ms
  - waiting for locator('nav')

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
  - main [ref=e18]
  - contentinfo [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - link "SecureShare" [ref=e22] [cursor=pointer]:
          - /url: /
          - generic [ref=e24]: SecureShare
        - paragraph [ref=e25]: End-to-end encrypted file sharing for teams that care about privacy.
        - generic [ref=e26]:
          - link "GitHub" [ref=e27] [cursor=pointer]:
            - /url: https://github.com
            - img [ref=e28]
          - link "LinkedIn" [ref=e30] [cursor=pointer]:
            - /url: https://linkedin.com
            - img [ref=e31]
          - link "Twitter" [ref=e33] [cursor=pointer]:
            - /url: https://twitter.com
            - img [ref=e34]
      - navigation "Footer" [ref=e36]:
        - generic [ref=e37]:
          - heading "Product" [level=4] [ref=e38]
          - list [ref=e39]:
            - listitem [ref=e40]:
              - link "Features" [ref=e41] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e42]:
              - link "Pricing" [ref=e43] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e44]:
              - link "Changelog" [ref=e45] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e46]:
          - heading "Company" [level=4] [ref=e47]
          - list [ref=e48]:
            - listitem [ref=e49]:
              - link "About" [ref=e50] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e51]:
              - link "Careers" [ref=e52] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e53]:
              - link "Blog" [ref=e54] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e55]:
          - heading "Support" [level=4] [ref=e56]
          - list [ref=e57]:
            - listitem [ref=e58]:
              - link "Help Center" [ref=e59] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e60]:
              - link "Contact" [ref=e61] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e62]:
              - link "Privacy" [ref=e63] [cursor=pointer]:
                - /url: "#"
    - generic [ref=e64]:
      - paragraph [ref=e65]: © 2026 SecureShare. All rights reserved.
      - paragraph [ref=e66]:
        - text: Made with
        - img [ref=e67]
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
  17 |     await expect(page.getByText("Expiring Links")).toBeVisible();
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
> 74 |     await expect(page.locator("nav")).toBeVisible();
     |                                       ^ Error: expect(locator).toBeVisible() failed
  75 |     await expect(page.locator("footer")).toBeVisible();
  76 |   });
  77 | });
  78 | 
```