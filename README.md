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
| `src/main.js` | Scoring engine, report and file upload |
| `src/styles.css` | All styling and both palettes |
| `render.yaml` | Render static-site deployment configuration |
| `package.json` | Vite scripts and Node.js dependencies |

## Run it locally
Install Node.js 20 or newer, then run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

To create and preview the production build:

```bash
npm run build
npm run preview
```

## Publish with GitHub Pages

GitHub Pages can publish the generated `dist` directory with a static-hosting workflow.

## Deploy to Render

The included `render.yaml` creates a Render static site:

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render runs `npm ci && npm run build` and publishes `dist`.

You can also create a static site manually with:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`

## Internet access needed

The page loads IBM Plex fonts from Google Fonts. The PDF reader (pdf.js) and Word reader (mammoth) load from cdnjs, but only when a PDF or .docx file is uploaded. Without a connection the tool still works with pasted text and system fonts.

## The "Claude report" tab

This tab calls Claude through the claude.ai artifact runtime. It works only when the page is opened inside claude.ai. On GitHub Pages it shows as unavailable and every other part of the tool works normally. To enable it on your own site you would need to replace the call in `app.js` (search for `window.claude`) with a request to your own backend that calls the Claude API. Never put an API key in front-end code.

## Privacy

Everything is processed in the browser. The last pasted texts and your palette choice are saved in the browser's local storage on your device only. Use **Clear both** to remove the texts.
