# PDF Tally Converter

A web application for converting and processing PDF tally sheets.

## Hosting Instructions

### GitHub Pages Setup

1. Push your code to a GitHub repository
2. Go to your repository settings
3. Navigate to "Pages" under "Code and automation"
4. Under "Source", select "Deploy from a branch"
5. Select the branch you want to deploy (usually "main" or "master")
6. Select the root folder "/(root)"
7. Click "Save"
8. Wait a few minutes for GitHub Pages to build and deploy your site
9. Your site will be available at `https://[your-username].github.io/[repository-name]`

### Render Setup

1. Create a new account on [Render](https://render.com) if you haven't already
2. Click "New +" and select "Static Site"
3. Connect your GitHub repository
4. Configure the following settings:
   - Name: `pdf-tally-converter` (or your preferred name)
   - Branch: `main` (or your deployment branch)
   - Root Directory: `.`
   - Build Command: (leave empty for static site)
   - Publish Directory: `.`
5. Click "Create Static Site"
6. Render will automatically build and deploy your site
7. Your site will be available at the URL provided by Render

## Development

To run the project locally:

1. Clone the repository
2. Open the `index.html` file in your browser
3. Make changes and test locally before deploying

## License

[Add your license information here] 