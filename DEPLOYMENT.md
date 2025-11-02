# GitHub Pages Deployment Guide

## Automatic Deployment with GitHub Pages

### Step 1: Enable GitHub Pages
1. Go to your repository settings
2. Navigate to "Pages" section
3. Under "Source", select "main" branch
4. Select "/" (root) folder
5. Click "Save"

### Step 2: Wait for Deployment
GitHub will automatically deploy your site to:
`https://yourusername.github.io/privacy-sandbox/`

### Step 3: Custom Domain (Optional)
1. Add a CNAME file with your domain
2. Configure DNS settings with your provider
3. Enable "Enforce HTTPS" in repository settings

## Manual Deployment

If you prefer manual deployment:

\`\`\`bash
# Build and deploy
git add .
git commit -m "Deploy website"
git push origin main
\`\`\`

## Local Development

To test locally before deployment:

1. **Using Python:**
\`\`\`bash
python -m http.server 8000
# Visit http://localhost:8000
\`\`\`

2. **Using Node.js:**
\`\`\`bash
npx http-server -p 8000
# Visit http://localhost:8000
\`\`\`

3. **Using VS Code Live Server:**
- Install "Live Server" extension
- Right-click index.html
- Select "Open with Live Server"

## File Structure for GitHub Pages

Ensure your repository has this structure:

\`\`\`
privacy-sandbox/
├── index.html          # Main page (required at root)
├── css/
│   └── style.css
├── js/
│   ├── privacy_sandbox_complete.js
│   ├── dashboard.js
│   ├── demo.js
│   └── main.js
├── docs/               # Optional documentation pages
├── assets/             # Images, icons, etc.
├── README.md
└── LICENSE
\`\`\`

## Troubleshooting

### Site Not Loading
- Check if GitHub Pages is enabled in settings
- Verify branch and folder settings
- Wait 1-2 minutes for deployment
- Clear browser cache

### CSS/JS Not Loading
- Check file paths (use relative paths)
- Verify all files are committed and pushed
- Check browser console for errors

### 404 Errors
- Ensure index.html is at repository root
- Check file names (case-sensitive on GitHub Pages)
- Verify all links use correct paths

## Performance Optimization

### 1. Minify Files
\`\`\`bash
# Install terser for JS minification
npm install -g terser

# Minify JavaScript
terser js/privacy_sandbox_complete.js -o js/privacy_sandbox_complete.min.js

# Minify CSS (using cssnano)
npm install -g cssnano-cli
cssnano css/style.css css/style.min.css
\`\`\`

### 2. Enable Caching
Add this to your HTML head:
\`\`\`html
<meta http-equiv="Cache-Control" content="public, max-age=31536000">
\`\`\`

### 3. Use CDN for Large Files
Consider using jsDelivr for better performance:
\`\`\`html
<script src="https://cdn.jsdelivr.net/gh/yourusername/privacy-sandbox@main/js/privacy_sandbox_complete.js"></script>
\`\`\`

## Analytics (Privacy-Respecting)

If you want to add analytics while respecting privacy:

1. **Plausible Analytics** (privacy-focused)
2. **Matomo** (self-hosted)
3. **Simple Analytics**

Avoid Google Analytics to stay true to privacy mission!

## Custom Subdomain

To use a subdomain like `privacy.yourdomain.com`:

1. Add CNAME record in DNS:
\`\`\`
privacy.yourdomain.com  CNAME  yourusername.github.io
\`\`\`

2. Create CNAME file in repository root:
\`\`\`
privacy.yourdomain.com
\`\`\`

3. Enable HTTPS in GitHub Pages settings

---

**Your Privacy Sandbox website will be live at:**
`https://yourusername.github.io/privacy-sandbox/`

Replace `yourusername` with your actual GitHub username!