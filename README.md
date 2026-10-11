# wazoo-anatomy

An illustrated gallery of anatomy figures explaining how Wazoo projects work.

Each figure takes one mechanism apart — a single, self-contained, interactive
isometric HTML page — and the whole set is built and published to GitHub Pages:
the gallery at the site root, each figure at its own subpath.

**Site:** https://wazootech.github.io/wazoo-anatomy/

## Layout

```text
figures/<slug>/     build.mjs, model.mjs, live.js, figure.json  (one figure per directory)
kit/                vendored isometric kit (see Licensing)
scripts/            build-site.mjs, inline-kit.mjs, and local QA tools
gallery/template.html   the gallery page template (build-site fills in the cards)
.github/workflows/pages.yml   build + deploy to Pages on push to main
```

## Add a figure

1. Create `figures/<slug>/` with a `build.mjs` that writes `index.html` (dark)
   and, with `--light`, `index-light.html` beside itself.
2. Add `figure.json`:

   ```json
   {
     "project": "Worlds",
     "title": "Hybrid recall",
     "blurb": "One sentence on what the figure shows.",
     "prompt": "The prompt used to generate the figure.",
     "order": 1
   }
   ```

Figures are grouped by `project` in the gallery and ordered by `order`. The
`prompt` is shown beside each figure so the gallery doubles as a prompt catalog.

The build convention matches the anatomy skill: a figure imports the kit with
`../../kit/iso-kit.mjs` and inlines it with `../../scripts/inline-kit.mjs`.

## Build locally

```sh
node scripts/build-site.mjs
```

This runs every `figures/*/build.mjs` (dark + light) and assembles the gallery
into `_site/`. Open `_site/index.html` to preview; it needs no server.

Deployment is automatic: push to `main` builds and publishes via GitHub Actions.
The repository's Pages source must be set to **GitHub Actions**.

## QA

`scripts/lines.mjs` (with `drive.mjs` and `line-ends.mjs`) is the anatomy skill's
line-end checker and needs a local Chrome; it is not run in CI.

```
node scripts/lines.mjs _site/<slug>/index.html
```

## Licensing

Our content — the gallery, the build script, and each figure — is MIT, see
[LICENSE](LICENSE).

`kit/` is a vendored copy of the isometric kit from the **anatomy** agent skill
by Ryan, used under the MIT License; its terms are preserved in
[kit/LICENSE](kit/LICENSE) and it is not original work of this repository.
