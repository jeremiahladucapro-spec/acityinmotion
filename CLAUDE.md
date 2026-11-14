# acityinmotion.com

Static site for the podcast A City in Motion. Read README.md first.

- Edit only files in `site/`. `dist/` is build output and is gitignored.
- Deployment is automatic: push to `main` on GitHub and Cloudflare Workers
  Builds runs `sh pipeline/build_site.sh` then `npx wrangler deploy`.
  Other branches get preview deployments. Never deploy by hand.
- Run `sh pipeline/build_site.sh` before committing. It fails on links to
  local files that do not exist in `site/`.
- Pages are hand-written HTML with inline CSS and share a nav and footer.
  When changing the nav, footer, or site-wide styles, change every page.
- Vision Zero language: say "crash", never "accident".
- There is no Node on this Mac. Do not add a build step that needs it;
  the build script must stay POSIX sh.
- Commit messages: short, present tense, say what changed on the site.
