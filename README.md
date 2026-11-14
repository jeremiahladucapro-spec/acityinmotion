# A City in Motion, website

acityinmotion.com. Static HTML, no framework. Built by a shell script and
served by Cloudflare as a Worker with static assets, deployed automatically
from GitHub. Same setup as the `deep-street` project.

```
acityinmotion/
  site/                  the website: every file in here is published as-is
    index.html, episodes.html, blog.html, ...
    street-builder.js
    media/
    robots.txt
  pipeline/build_site.sh builds site/ into dist/ and checks local links
  wrangler.jsonc         Cloudflare Worker config (serves ./dist)
  package.json           pins wrangler so `npx wrangler deploy` works in the cloud
  dist/                  build output, ignored by git, never edit
```

## How a change goes live

1. Edit files in `site/`.
2. Commit and push to `main` on GitHub.
3. Cloudflare Workers Builds sees the push, runs `sh pipeline/build_site.sh`,
   then `npx wrangler deploy`. Live in about a minute.
4. Pushing any other branch, or opening a pull request, builds a preview at
   `<branch>-acityinmotion.jeremiahladuca-pro.workers.dev` instead.

Nothing is needed on this Mac beyond git. Node and wrangler run in Cloudflare's
build container, not here.

Check what is deployed: https://acityinmotion.com/build.txt shows the commit.

## Build rules

`pipeline/build_site.sh` fails the build if a page links to a local file that
is not in `site/`. Fix the link or add the file. To ship anyway, set the
Workers Builds variable `ALLOW_MISSING=1`.

## One-time setup (done once, kept here for reference)

### GitHub
1. Create a private repo `acityinmotion` on github.com (no README, no .gitignore).
2. In this folder:
   ```
   git remote add origin https://github.com/<you>/acityinmotion.git
   git push -u origin main
   ```
   Git asks for a username and a password. Use a GitHub personal access token
   as the password; macOS keychain remembers it.

### Cloudflare
1. Dashboard, **Workers & Pages, Create, Workers, Import a repository**.
   Pick the `acityinmotion` repo. Same flow used for `deep-street`.
2. Fill in:
   - Project name: `acityinmotion`
   - Build command: `sh pipeline/build_site.sh`
   - Deploy command: `npx wrangler deploy`
   - Non-production branch deploy command: `npx wrangler versions upload`
   - Enable Preview builds: on
3. Deploy. The first build publishes to
   `acityinmotion.jeremiahladuca-pro.workers.dev`. Check it.
4. Move the domain. The current site is a Cloudflare Pages project with
   `acityinmotion.com` attached. In the Pages project, **Custom domains**,
   remove `acityinmotion.com` and `www.acityinmotion.com`. Then in the new
   Worker, **Domains, Add Domain**, add both. Cloudflare rewrites DNS and the
   certificate; the swap takes a few minutes. Do this once the workers.dev
   preview looks right.
5. Optional: delete the old Pages project once the domain is serving from
   the Worker.

## Local preview

Open `site/index.html` in a browser. For a server that matches production
(needs Node): `npx wrangler dev` after `sh pipeline/build_site.sh`.
