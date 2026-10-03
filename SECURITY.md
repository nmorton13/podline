# Security Policy

Please report vulnerabilities privately through this repository's
[Security tab](https://github.com/nmorton13/podline/security)
(**Report a vulnerability**), not in a public issue.

## What podline does on your machine

- **Network:** fetches the RSS feeds you subscribe to and the Apple Podcasts search API
  (`itunes.apple.com`), through Claude Code's host. Nothing else, and no account or key.
- **Processes:** runs `mpv` in the background to play audio, and `nc` to talk to it over a
  Unix socket in `/tmp`. Arguments are passed as an argument vector, never through a shell
  string.
- **Storage:** subscriptions, positions, Up Next and summaries live in Claude Code's plugin
  store for podline.
- **Claude:** `?` sends an episode's title and show notes to a small Claude model (Haiku) for
  a summary.

## Untrusted input

Feed titles, show notes and enclosure URLs come from third parties. podline strips terminal
escape sequences and control characters from feed text, plays only `http(s)` enclosures, and
labels feed text it hands to Claude as data, not instructions.
