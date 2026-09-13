# Sai Vista Water Transparency Dashboard

Static, GitHub Pages-ready water dashboard generated from the supplied Sai Vista sensor workbooks.

## Publish on GitHub Pages
1. Create a new public or private GitHub repository.
2. Upload `index.html` and the `assets/` folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then Save.
6. GitHub will provide a URL such as `https://<username>.github.io/<repository>/`.

## Features
- August 2026 / September 2026 MTD filter
- Wing A–F filter
- Domestic / Drinking / Flushing filter
- PCMC received-water KPI
- Wing-wise segregated consumption
- August vs September average/day comparison
- Daily trend chart
- Main-tank received vs used/outflow
- Automatic insights
- CSV export
- Print / Save as PDF
- Responsive mobile/desktop design

## Note
The site loads Bootstrap, jQuery and Chart.js from CDNs. The data itself is embedded locally in `assets/data.js`.
