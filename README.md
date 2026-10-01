# Internship Autofill

A local browser extension for Chrome, Microsoft Edge, and Firefox. Save your profile once, scan an application, and fill repeated fields with one click. No account, subscription, API key, or external service.

## Download

**[Download Internship Autofill v1.0.0 (ZIP)](https://github.com/rizxe134/internship-autofill/releases/download/v1.0.0/internship-autofill-v1.0.0.zip)**

Download the ZIP, right-click it and choose **Extract All**, then follow the browser instructions below. No coding or build tools are needed. [View the latest release](https://github.com/rizxe134/internship-autofill/releases/latest).

## Install in Chrome or Edge

1. Extract the ZIP if you downloaded the packaged version.
2. Chrome: open `chrome://extensions`. Edge: open `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the **chromium** folder (the folder containing `manifest.json`).
5. Pin **Internship Autofill** using the browser's Extensions menu.

## Install in Firefox

1. Extract the ZIP.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**, then select `firefox/manifest.json`.
4. Use **Internship Autofill** from the Extensions menu.

Firefox's temporary installation lasts until Firefox restarts. For permanent installation in standard Firefox, this extension needs Mozilla signing; the source here is not signed or published. Chrome and Edge support the unpacked installation above.

## Use

1. Click the extension and choose **Edit profile**.
2. Enter your details and **Save profile**. Blank values won't be filled.
3. For repeated questions, add the exact question label and your own answer under **Answers you use again**. This can include a work authorization answer or a reusable paragraph. Answers use exact matching after ignoring punctuation and letter case. The app never invents information.
4. Open an internship application. Choose **Scan page** to preview matches, then **Fill this page**.
5. Optionally enable **Also fill new fields** before filling. This watches dynamically revealed fields on the current document. New page navigation/reload requires clicking again. **Stop auto** disables it; **Undo** stops it and restores the fields it changed, unless you edited them afterward.
6. Review your application, upload your resume, answer remaining questions, and submit yourself.

## Supported fields and limits

Supports ordinary visible text inputs, textareas, native dropdowns, standard autocomplete attributes, associated labels, ARIA labels, and common field names. It also looks inside accessible same-origin frames and open shadow roots. Dropdown answers must match one option's text or value. Existing answers are kept. Only the visible page is scanned; hidden fields are skipped.

Custom dropdown widgets, radio buttons, consent checkboxes, cross-origin frames, resume uploads, CAPTCHAs, and site-specific multi-part widgets need manual input. Ambiguous or unfamiliar question labels are left for you to fill. Dates must match the input format (`YYYY-MM` or `YYYY-MM-DD`). Framework-controlled forms may reject or reset filled values; review them. No claim of universal support for every application platform.

The extension does not automatically submit, navigate, click application buttons, or upload files. Page access is granted when you invoke it, using `activeTab` and `scripting` rather than continuous access to all websites. Your profile stays in this browser's local extension storage. A filled website receives the values just as it would when you type them. Exported backups are plain JSON containing your personal information; keep them private. The app makes no network requests.

## Try the included demo

Open `demo.html` in your browser. To run the extension on it, serve this folder over HTTP, for example:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8765/demo.html`. Enter matching sample profile details, scan, fill, reveal an additional question, and undo.

## Source and checks

To run the automated tests with Node.js:

```sh
npm install
npx playwright install chromium
npm test
```

The tests exercise the form engine in a browser and use a storage stub to test the profile editor. To use an installed Chrome or Edge instead of the downloaded test browser, set `TEST_BROWSER` to `chrome` or `msedge`. No build step is needed to install the extension.

The `chromium` and `firefox` folders contain the complete extension with no build step. Automated checks passed in installed Chrome and Edge for scanning, matching, filling, preserving existing answers, dynamic fields, undo, stopping auto mode, same-origin frames, open shadow roots, and profile save/reload. JavaScript syntax was also checked. The browser APIs have not been tested in a live installed extension, and Firefox has not been runtime-tested. No automated check has been run against your actual internship sites. Installation and real-site verification remain necessary.

Official API reference: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab