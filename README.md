# ATS Match Checker

A strict CV review tool for the Malawi job market. Choose the employer type, add a job advert and your CV, and get a critical score, ranked weak points, and the exact wording to rewrite.

## What it does

- **Five employer types** with their own scoring weights and fit checks: Malawi Government, NGO, UN / International, Private sector, SME.
- **Scores out of 100** across seven areas: ATS compatibility, education, experience, skills, achievements, presentation and fit for the employer type. It is an indicative assessment, not a prediction of being shortlisted.
- **Top five critical weaknesses**, a section-by-section review, a requirements check against the advert, and keyword gaps.
- **Exact rewrites** shown as current wording, suggested wording and the questions to answer. Text in `[brackets]` is a blank to fill with true information. Nothing is invented.
- **File upload** for PDF, Word (.docx) and text files, read in the browser. Nothing is uploaded to a server.
- **Two colour palettes**, light and dark.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | All styling and both palettes |
| `app.js` | Scoring engine, report, file upload |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

There is no build step and no dependencies to install.

## Run it locally

Open `index.html` in a browser. To serve it over HTTP instead:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Publish with GitHub Pages

1. Create a new repository on GitHub and upload these files to the root of the `main` branch.
2. Open **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, then save.
4. After a minute the site is live at `https://<your-username>.github.io/<repository-name>/`.

## Internet access needed

The page loads IBM Plex fonts from Google Fonts. The PDF reader (pdf.js) and Word reader (mammoth) load from cdnjs, but only when a PDF or .docx file is uploaded. Without a connection the tool still works with pasted text and system fonts.

## The "Claude report" tab

This tab calls Claude through the claude.ai artifact runtime. It works only when the page is opened inside claude.ai. On GitHub Pages it shows as unavailable and every other part of the tool works normally. To enable it on your own site you would need to replace the call in `app.js` (search for `window.claude`) with a request to your own backend that calls the Claude API. Never put an API key in front-end code.

## Privacy

Everything is processed in the browser. The last pasted texts and your palette choice are saved in the browser's local storage on your device only. Use **Clear both** to remove the texts.
