# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-auth-flows.spec.js >> Register flow >> Join organization shows invite code + role grid
- Location: tests\e2e\04-auth-flows.spec.js:81:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Admin')
Expected: visible
Error: strict mode violation: getByText('Admin') resolved to 2 elements:
    1) <span class="_roleHeader_1bnat_201">…</span> aka getByText('Admin', { exact: true })
    2) <span class="_roleDesc_1bnat_212">Administrator with user management.</span> aka getByText('Administrator with user')

Call log:
  - Expect "toBeVisible" with timeout 6000ms
  - waiting for getByText('Admin')

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
    - generic [ref=e22]:
      - generic [ref=e23]:
        - heading "Create your account" [level=1] [ref=e24]
        - paragraph [ref=e25]: Join the platform that treats your files like they matter.
      - generic [ref=e26]:
        - generic [ref=e27]:
          - generic [ref=e28]:
            - text: Username
            - generic [ref=e29]: "*"
          - generic [ref=e30]:
            - generic:
              - img
            - textbox "Username" [ref=e31]:
              - /placeholder: janedoe
        - generic [ref=e32]:
          - generic [ref=e33]:
            - text: Email
            - generic [ref=e34]: "*"
          - generic [ref=e35]:
            - generic:
              - img
            - textbox "Email" [ref=e36]:
              - /placeholder: you@company.com
        - generic [ref=e37]:
          - generic [ref=e38]:
            - text: Password
            - generic [ref=e39]: "*"
          - generic [ref=e40]:
            - generic:
              - img
            - textbox "Password" [ref=e41]:
              - /placeholder: ••••••••
            - button "Show password" [ref=e43] [cursor=pointer]:
              - img [ref=e44]
          - paragraph [ref=e46]: At least 8 characters.
        - generic [ref=e47]:
          - generic [ref=e48]:
            - text: Confirm password
            - generic [ref=e49]: "*"
          - generic [ref=e50]:
            - generic:
              - img
            - textbox "Confirm password" [ref=e51]:
              - /placeholder: ••••••••
            - button "Show password" [ref=e53] [cursor=pointer]:
              - img [ref=e54]
        - separator [ref=e56]:
          - generic [ref=e58]: Organization · optional
        - generic [ref=e60]:
          - button "Create organization" [ref=e61] [cursor=pointer]:
            - img [ref=e62]
            - text: Create organization
          - button "Join organization" [active] [ref=e64] [cursor=pointer]:
            - img [ref=e65]
            - text: Join organization
        - generic [ref=e67]:
          - generic [ref=e68]:
            - generic [ref=e69]:
              - text: Invite code
              - generic [ref=e70]: "*"
            - generic [ref=e71]:
              - generic:
                - img
              - textbox "Invite code" [ref=e72]:
                - /placeholder: ABCD-1234
            - paragraph [ref=e73]: Case-sensitive — copy it exactly.
          - paragraph [ref=e74]:
            - img [ref=e75]
            - generic [ref=e77]: Ask your organization manager for the invite code.
          - generic [ref=e78]:
            - generic [ref=e79]: Select your role
            - generic [ref=e80]:
              - generic [ref=e81] [cursor=pointer]:
                - radio "Staff Regular employee with basic file access." [checked]
                - generic [ref=e82]:
                  - img [ref=e83]
                  - text: Staff
                - generic [ref=e85]: Regular employee with basic file access.
              - generic [ref=e86] [cursor=pointer]:
                - radio "Admin Administrator with user management."
                - generic [ref=e87]:
                  - img [ref=e88]
                  - text: Admin
                - generic [ref=e90]: Administrator with user management.
          - generic [ref=e91]:
            - generic [ref=e92]: Job title (optional)
            - generic [ref=e93]:
              - generic:
                - img
              - textbox "Job title (optional)" [ref=e94]:
                - /placeholder: Software Engineer
          - generic [ref=e95]:
            - generic [ref=e96]: Department (optional)
            - generic [ref=e97]:
              - generic:
                - img
              - textbox "Department (optional)" [ref=e98]:
                - /placeholder: Engineering
        - button "Create account" [ref=e99] [cursor=pointer]:
          - generic [ref=e100]: Create account
        - paragraph [ref=e101]:
          - text: Already have an account?
          - link "Sign in" [ref=e102] [cursor=pointer]:
            - /url: /login
  - contentinfo [ref=e103]:
    - generic [ref=e104]:
      - generic [ref=e105]:
        - link "SecureShare" [ref=e106] [cursor=pointer]:
          - /url: /
          - generic [ref=e108]: SecureShare
        - paragraph [ref=e109]: End-to-end encrypted file sharing for teams that care about privacy.
        - generic [ref=e110]:
          - link "GitHub" [ref=e111] [cursor=pointer]:
            - /url: https://github.com
            - img [ref=e112]
          - link "LinkedIn" [ref=e114] [cursor=pointer]:
            - /url: https://linkedin.com
            - img [ref=e115]
          - link "Twitter" [ref=e117] [cursor=pointer]:
            - /url: https://twitter.com
            - img [ref=e118]
      - navigation "Footer" [ref=e120]:
        - generic [ref=e121]:
          - heading "Product" [level=4] [ref=e122]
          - list [ref=e123]:
            - listitem [ref=e124]:
              - link "Features" [ref=e125] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e126]:
              - link "Pricing" [ref=e127] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e128]:
              - link "Changelog" [ref=e129] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e130]:
          - heading "Company" [level=4] [ref=e131]
          - list [ref=e132]:
            - listitem [ref=e133]:
              - link "About" [ref=e134] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e135]:
              - link "Careers" [ref=e136] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e137]:
              - link "Blog" [ref=e138] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e139]:
          - heading "Support" [level=4] [ref=e140]
          - list [ref=e141]:
            - listitem [ref=e142]:
              - link "Help Center" [ref=e143] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e144]:
              - link "Contact" [ref=e145] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e146]:
              - link "Privacy" [ref=e147] [cursor=pointer]:
                - /url: "#"
    - generic [ref=e148]:
      - paragraph [ref=e149]: © 2026 SecureShare. All rights reserved.
      - paragraph [ref=e150]:
        - text: Made with
        - img [ref=e151]
        - text: by the SecureShare team
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
  46  |     await expect(page.getByText("Step 1 of 2")).toBeVisible();
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
> 86  |     await expect(page.getByText("Admin")).toBeVisible();
      |                                           ^ Error: expect(locator).toBeVisible() failed
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