# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 10-upload.spec.js >> Dashboard file upload >> Selecting a file triggers the upload request
- Location: tests\e2e\10-upload.spec.js:34:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
        - heading "My Files" [level=1] [ref=e22]
        - generic [ref=e23]:
          - generic [ref=e24] [cursor=pointer]:
            - img [ref=e25]
            - text: Upload File
          - button "Upload File"
      - generic [ref=e27]:
        - generic [ref=e28]:
          - img [ref=e29]
          - generic [ref=e31]:
            - heading "Join or Create an Organization" [level=3] [ref=e32]
            - paragraph [ref=e33]: Collaborate with your team securely
        - generic [ref=e34]:
          - button "Create Organization" [ref=e35] [cursor=pointer]:
            - img [ref=e36]
            - text: Create Organization
          - button "Join with Code" [ref=e38] [cursor=pointer]:
            - img [ref=e39]
            - text: Join with Code
      - generic [ref=e41]:
        - generic [ref=e42]: 📁
        - heading "No files yet" [level=3] [ref=e43]
        - paragraph [ref=e44]: Upload your first file to get started
        - generic [ref=e45] [cursor=pointer]:
          - img [ref=e46]
          - text: Upload File
        - button "Upload File"
  - contentinfo [ref=e48]:
    - generic [ref=e49]:
      - generic [ref=e50]:
        - link "SecureShare" [ref=e51] [cursor=pointer]:
          - /url: /
          - generic [ref=e53]: SecureShare
        - paragraph [ref=e54]: End-to-end encrypted file sharing for teams that care about privacy.
        - generic [ref=e55]:
          - link "GitHub" [ref=e56] [cursor=pointer]:
            - /url: https://github.com
            - img [ref=e57]
          - link "LinkedIn" [ref=e59] [cursor=pointer]:
            - /url: https://linkedin.com
            - img [ref=e60]
          - link "Twitter" [ref=e62] [cursor=pointer]:
            - /url: https://twitter.com
            - img [ref=e63]
      - navigation "Footer" [ref=e65]:
        - generic [ref=e66]:
          - heading "Product" [level=4] [ref=e67]
          - list [ref=e68]:
            - listitem [ref=e69]:
              - link "Features" [ref=e70] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e71]:
              - link "Pricing" [ref=e72] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e73]:
              - link "Changelog" [ref=e74] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e75]:
          - heading "Company" [level=4] [ref=e76]
          - list [ref=e77]:
            - listitem [ref=e78]:
              - link "About" [ref=e79] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e80]:
              - link "Careers" [ref=e81] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e82]:
              - link "Blog" [ref=e83] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e84]:
          - heading "Support" [level=4] [ref=e85]
          - list [ref=e86]:
            - listitem [ref=e87]:
              - link "Help Center" [ref=e88] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e89]:
              - link "Contact" [ref=e90] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e91]:
              - link "Privacy" [ref=e92] [cursor=pointer]:
                - /url: "#"
    - generic [ref=e93]:
      - paragraph [ref=e94]: © 2026 SecureShare. All rights reserved.
      - paragraph [ref=e95]:
        - text: Made with
        - img [ref=e96]
        - text: by the SecureShare team
```

# Test source

```ts
  1  | // 10 — File upload UI: locate the upload control and exercise it with a fake file
  2  | // via setInputFiles. Backend upload endpoint is mocked.
  3  | import { test, expect } from "@playwright/test";
  4  | import { mockAuthOk, loginAs } from "./helpers.js";
  5  | 
  6  | test.describe("Dashboard file upload", () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await loginAs(page);
  9  |     await mockAuthOk(page, { withProfile: true });
  10 | 
  11 |     let uploaded = false;
  12 |     await page.route("**/api/files/upload**", async (route) => {
  13 |       uploaded = true;
  14 |       await route.fulfill({
  15 |         status: 200,
  16 |         contentType: "application/json",
  17 |         body: JSON.stringify({
  18 |           success: true,
  19 |           file: { _id: "f_e2e", fileName: "e2e-upload.txt", fileSize: 12, fileType: "text/plain", createdAt: new Date().toISOString() },
  20 |         }),
  21 |       });
  22 |     });
  23 |     page.uploaded = () => uploaded;
  24 | 
  25 |     await page.route("**/api/files**", (route) => {
  26 |       // Default empty list
  27 |       route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ files: [] }) });
  28 |     });
  29 |     await page.route("**/api/organization**", (route) =>
  30 |       route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ organization: null }) }),
  31 |     );
  32 |   });
  33 | 
  34 |   test("Selecting a file triggers the upload request", async ({ page }) => {
  35 |     await page.goto("/dashboard");
  36 |     // Wait for the page chunk to mount; ErrorBoundary should NOT be visible
  37 |     await expect(page.locator("text=Something broke on the page")).toHaveCount(0);
  38 | 
  39 |     const fileInput = page.locator('input[type="file"]').first();
  40 |     const inputExists = await fileInput.count();
  41 |     test.skip(inputExists === 0, "Dashboard upload input not present in this state — pre-refactor surface");
  42 | 
  43 |     await fileInput.setInputFiles({
  44 |       name: "e2e-upload.txt",
  45 |       mimeType: "text/plain",
  46 |       buffer: Buffer.from("hello e2e!"),
  47 |     });
  48 | 
  49 |     // Either a toast or the request was routed
  50 |     await page.waitForTimeout(1500);
> 51 |     expect(page.uploaded()).toBe(true);
     |                             ^ Error: expect(received).toBe(expected) // Object.is equality
  52 |   });
  53 | });
  54 | 
```