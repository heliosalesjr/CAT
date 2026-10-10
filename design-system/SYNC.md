# This folder is a mirror. Do not edit it by hand.

The design system lives in an Artifact, and that Artifact is the source of
truth:

**https://claude.ai/artifact/CEyUgkwcBdsoW3aZCfctqU**

Tokens, guidelines and component previews are edited there — on the page, or by
asking Claude. These files are a read-only copy, kept in Git so the values are
reviewable in a PR and available to the build.

## Why a mirror at all

The Artifact is browsable and editable but is not in the repository, so without
this copy a token change would never appear in a diff and nothing in `web1/`
could read the values. The mirror fixes both. It buys that at the cost of being
able to go stale, which is what the rules below are for.

## Rules

**Edits made here are lost.** The next sync overwrites this folder from the
Artifact. If you change a token in `tokens.json` here, it will be reverted and
the live system will never see it. Change it in the Artifact instead.

**`web1/src/app/globals.css` is still maintained by hand.** It carries its own
copy of these hex values in its Tailwind `@theme` block. Nothing generates one
from the other yet, so a token change has to be applied in both places until a
generator exists. This is the known weak point of the current setup.

## Path mapping

The Artifact stores everything under `project/`; this folder drops that prefix.

| Artifact | here |
| --- | --- |
| `project/tokens.json` | `tokens.json` |
| `project/README.md` | `README.md` |
| `project/components/Button/README.md` | `components/Button/README.md` |

`design-system.json` is the Artifact's own index — metadata about the system,
not part of it. It is mirrored for completeness and is not read by anything in
this repository.

## Re-syncing

Ask Claude to sync the design system. It reads every file from the Artifact by
path and rewrites this folder, then reports what changed. Do not copy files
across by hand — the version below is how drift gets detected, and a manual copy
leaves it lying.

## Last sync

| | |
| --- | --- |
| Artifact version | `1791606858-6016` |
| Synced at | 2026-10-10 |
| Files | 17 |
| Direction | Artifact → repo (one-way) |
