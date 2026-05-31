# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-auth-flows.spec.js >> Login two-step flow >> Back to login button returns to Step 1
- Location: tests\e2e\04-auth-flows.spec.js:38:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Step 1 of 2')
Expected: visible
Timeout: 6000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 6000ms
  - waiting for getByText('Step 1 of 2')

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
  - text: Step 2 of 2
  - heading "Welcome back" [level=1]
  - paragraph: Enter the 6-character verification code we just emailed you.
  - paragraph:
    - img
    - text: We sent a 6-character code to
    - strong: e2e@test.com
    - text: . It expires in 5 minutes.
  - text: Verification code
  - img
  - textbox "Verification code":
    - /placeholder: ABC123
  - button "Verify & Sign in"
  - button "Back to login":
    - img
    - text: Back to login
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
  1   | // 04 — Auth flows: login two-step, register, forgot password.
  2   | // Backend is mocked; what we're testing is the UI state machine, validation,
  3   | // toast surfacing, and post-success navigation.
  4   | import { test, expect } from "@playwright/test";
  5   | import { mockAuthOk } from "./helpers.js";
  6   | 
  7   | test.describe("Login two-step flow", () => {
  8   |   test.beforeEach(async ({ page }) => {
  9   |     await mockAuthOk(page);
  10  |   });
  11  | 
  12  |   test("Step 1 → Step 2 → token submit redirects to dashboard", async ({ page }) => {
  13  |     await page.goto("/login");
  14  |     await page.getByPlaceholder("you@company.com").fill("e2e@test.com");
  15  |     await page.getByPlaceholder("••••••••").fill("SuperSecret123");
  16  |     await page.getByRole("button", { name: /^Continue$/ }).click();
  17  | 
  18  |     // Step 2 markers
  19  |     await expect(page.getByText(/code was sent to|We sent a 6-character code/i).first()).toBeVisible();
  20  |     await page.getByPlaceholder("ABC123").fill("XYZ987");
  21  |     await page.getByRole("button", { name: /Verify & Sign in/i }).click();
  22  | 
  23  |     // Token is stored, redirect happens
  24  |     await expect(page).toHaveURL(/\/dashboard$/, { timeout: 8000 });
  25  |   });
  26  | 
  27  |   test("Password toggle reveals and hides the password", async ({ page }) => {
  28  |     await page.goto("/login");
  29  |     const pwInput = page.getByPlaceholder("••••••••");
  30  |     await pwInput.fill("hidden");
  31  |     await expect(pwInput).toHaveAttribute("type", "password");
  32  |     await page.getByRole("button", { name: /Show password/i }).click();
  33  |     await expect(pwInput).toHaveAttribute("type", "text");
  34  |     await page.getByRole("button", { name: /Hide password/i }).click();
  35  |     await expect(pwInput).toHaveAttribute("type", "password");
  36  |   });
  37  | 
  38  |   test("Back to login button returns to Step 1", async ({ page }) => {
  39  |     await page.goto("/login");
  40  |     await page.getByPlaceholder("you@company.com").fill("e2e@test.com");
  41  |     await page.getByPlaceholder("••••••••").fill("Secret123");
  42  |     await page.getByRole("button", { name: /^Continue$/ }).click();
  43  |     await expect(page.getByText("Step 2 of 2")).toBeVisible();
  44  | 
  45  |     await page.getByRole("button", { name: /Back to login/i }).click();
> 46  |     await expect(page.getByText("Step 1 of 2")).toBeVisible();
      |                                                 ^ Error: expect(locator).toBeVisible() failed
  47  |   });
  48  | });
  49  | 
  50  | test.describe("Register flow", () => {
  51  |   test.beforeEach(async ({ page }) => {
  52  |     await mockAuthOk(page);
  53  |   });
  54  | 
  55  |   test("Submits without org and opens success modal", async ({ page }) => {
  56  |     await page.goto("/register");
  57  |     await page.getByLabel("Username", { exact: false }).fill("e2e_user");
  58  |     await page.getByLabel("Email", { exact: false }).fill("e2e@test.com");
  59  | 
  60  |     const pwField = page.locator('input[name="password"]');
  61  |     await pwField.fill("SuperSecret123");
  62  |     const cpwField = page.locator('input[name="confirmPassword"]');
  63  |     await cpwField.fill("SuperSecret123");
  64  | 
  65  |     await page.getByRole("button", { name: /Create account/i }).click();
  66  |     // Success modal: dialog with title "Registration successful"
  67  |     await expect(page.getByRole("dialog")).toBeVisible();
  68  |     await expect(page.getByText("Registration successful")).toBeVisible();
  69  |   });
  70  | 
  71  |   test("Toggles Create organization panel open and closed", async ({ page }) => {
  72  |     await page.goto("/register");
  73  |     const createBtn = page.getByRole("button", { name: /Create organization/i });
  74  |     await createBtn.click();
  75  |     await expect(page.getByText(/You'll become the/)).toBeVisible();
  76  |     await expect(page.getByLabel(/Organization name/i)).toBeVisible();
  77  |     await createBtn.click();
  78  |     await expect(page.getByLabel(/Organization name/i)).toHaveCount(0);
  79  |   });
  80  | 
  81  |   test("Join organization shows invite code + role grid", async ({ page }) => {
  82  |     await page.goto("/register");
  83  |     await page.getByRole("button", { name: /Join organization/i }).click();
  84  |     await expect(page.getByLabel(/Invite code/i)).toBeVisible();
  85  |     await expect(page.getByText("Staff")).toBeVisible();
  86  |     await expect(page.getByText("Admin")).toBeVisible();
  87  |   });
  88  | 
  89  |   test("Password mismatch surfaces error", async ({ page }) => {
  90  |     await page.goto("/register");
  91  |     await page.getByLabel("Username", { exact: false }).fill("u");
  92  |     await page.getByLabel("Email", { exact: false }).fill("u@e.com");
  93  |     await page.locator('input[name="password"]').fill("AlphaBeta1");
  94  |     await page.locator('input[name="confirmPassword"]').fill("DifferentOne1");
  95  |     await page.getByRole("button", { name: /Create account/i }).click();
  96  |     await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
  97  |   });
  98  | 
  99  |   test("Short password surfaces error", async ({ page }) => {
  100 |     await page.goto("/register");
  101 |     await page.getByLabel("Username", { exact: false }).fill("u");
  102 |     await page.getByLabel("Email", { exact: false }).fill("u@e.com");
  103 |     await page.locator('input[name="password"]').fill("short");
  104 |     await page.locator('input[name="confirmPassword"]').fill("short");
  105 |     await page.getByRole("button", { name: /Create account/i }).click();
  106 |     // Either client-side minLength prevents submit or our explicit check fires
  107 |     const err = page.getByText(/at least 8 characters/i);
  108 |     const stillOnForm = page.getByRole("heading", { name: "Create your account" });
  109 |     await expect(err.or(stillOnForm)).toBeVisible();
  110 |   });
  111 | });
  112 | 
  113 | test.describe("Forgot password flow", () => {
  114 |   test.beforeEach(async ({ page }) => {
  115 |     await mockAuthOk(page);
  116 |   });
  117 | 
  118 |   test("Step 1 → Step 2 → new password reset", async ({ page }) => {
  119 |     await page.goto("/forgot-password");
  120 |     await page.getByPlaceholder("you@company.com").fill("e2e@test.com");
  121 |     await page.getByRole("button", { name: /Send verification code/i }).click();
  122 |     await expect(page.getByText("Step 2 of 2")).toBeVisible();
  123 | 
  124 |     await page.getByPlaceholder("ABC123").fill("XYZ987");
  125 |     await page.getByLabel(/^New password/i).fill("BrandNewSecret1");
  126 |     await page.getByLabel(/Confirm new password/i).fill("BrandNewSecret1");
  127 |     await page.getByRole("button", { name: /^Reset password$/i }).click();
  128 | 
  129 |     // Auto-redirect kicks in after ~1.8s
  130 |     await expect(page).toHaveURL(/\/login$/, { timeout: 8000 });
  131 |   });
  132 | });
  133 | 
```