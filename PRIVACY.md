# Privacy

sidecast is a podcast player that runs inside Claude Code on your machine. It has no server, no
accounts and no analytics, and its developer receives nothing from it.

## What it keeps

Your subscriptions, the episodes in each feed, where you are in each episode, Up Next, your playback
speed and the summaries Claude wrote. All of it is in Claude Code's plugin store on your machine, and
it stays there until you unsubscribe from a show or remove the plugin.

## What leaves your machine

- **Feeds:** sidecast fetches the RSS feeds you subscribe to, once an hour and when you press refresh.
  These are plain requests to the feed's own address, with a `User-Agent` header naming the app,
  `sidecast (+https://github.com/nmorton13/sidecast)`. Each feed's host sees the request, as with any
  podcast app.
- **Search:** when you search for a show, your search words go to the Apple Podcasts search API
  (`itunes.apple.com`).
- **Audio:** `mpv` streams the episode from the address in the feed, so the podcast's host sees that
  request too.
- **Summaries:** when you press `?` on an episode, the show's name and author and the episode's title,
  length and show notes go to a Claude model, through Claude Code's own connection, to write the
  summary. Anthropic's terms for Claude Code apply to that request.

Nothing else is sent. sidecast never sends your library, your listening history or your conversation
with Claude anywhere.

## Questions

Open an issue at [github.com/nmorton13/sidecast/issues](https://github.com/nmorton13/sidecast/issues),
or report a security problem privately as [SECURITY.md](SECURITY.md) describes.
