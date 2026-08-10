# GitKB Viewer for Obsidian

View-only Obsidian desktop plugin for browsing GitKB documents.

GitKB remains the source of truth. This plugin does not project markdown into
your vault and does not edit, checkout, commit, delete, move, or mutate KB
documents.

## Features

- GitKB Explorer side pane powered by `git-kb list --json`
- Search UI powered by `git-kb search <query> --limit 500 --json`, reporting the
  true total when the KB has more matches than were fetched
- Readonly document view powered by `git-kb show <slug> --json`
- All-KB graph view powered by `git-kb graph <slug...> --json`
- `[[slug]]` wikilinks open readonly GitKB document views
- Copy slug, wikilink, and raw markdown
- Manual refresh plus optional auto-refresh
- Clear diagnostics for missing `git-kb`, invalid KB roots, and missing slugs

## Safety Model

The plugin uses an explicit command allowlist. It only runs:

- `git-kb list --json`
- `git-kb show <slug> --json`
- `git-kb search <query> --limit <n> --json`
- `git-kb board --json`
- `git-kb graph <slug...> --json`
- `git-kb --version`

Positional values are rejected if they begin with `-`, so a query can never be
smuggled in as a flag. `--limit` must be a bare positive integer.

It never calls `checkout`, `commit`, `create`, `set`, `rm`, `mv`, `reset`,
`clear`, `stash`, `pull`, `push`, `repair`, `reindex`, `project`, or
`projections`.

## Requirements

- Obsidian 1.5.0 or later, desktop only (this plugin shells out to `git-kb`, so
  it is `isDesktopOnly`)
- A `git-kb` binary on `PATH`, or an absolute path set in settings
- A directory containing a GitKB instance (a `.kb` directory)

Developed against `git-kb 0.2.x`.

## Install From Source

This plugin is not published to npm or the Obsidian community catalog. Build it
and copy the three runtime files into your vault:

```bash
git clone https://github.com/gitkb/obsidian-gitkb-viewer
cd obsidian-gitkb-viewer
npm install
npm run build
mkdir -p /path/to/vault/.obsidian/plugins/gitkb-viewer
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/gitkb-viewer/
```

Then enable **GitKB Viewer** under Settings → Community plugins, and set the
`git-kb` binary path and GitKB root path in its settings tab. Use **Test
connection** to confirm the plugin can reach your KB.

## Development

```bash
npm run dev        # esbuild watch
npm run typecheck  # tsc --noEmit
npm run smoke      # allowlist verification + live read-only CLI probe
```

`npm run smoke` runs against `GITKB_ROOT` (defaults to the current directory),
so point it at a real KB:

```bash
GITKB_ROOT=/path/to/project npm run smoke
```

## Settings

- `git-kb` binary path: defaults to `git-kb`
- GitKB root path: absolute path to the project containing `.kb`
- Refresh interval: optional, in seconds. `0` disables automatic refresh.

Every GitKB command is run with `GITKB_ROOT=<configured root>`.
