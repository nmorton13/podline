export const FEED = `<?xml version="1.0"?>
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
  <title><![CDATA[Night & Day]]></title>
  <itunes:author>Ada &amp; Co</itunes:author>
  <item>
    <title>Older one</title>
    <guid isPermaLink="false">ep-1</guid>
    <pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
    <itunes:duration>62:03</itunes:duration>
    <enclosure url="https://cdn.example.com/1.mp3" length="1" type="audio/mpeg"/>
    <description><![CDATA[<p>Hello <b>world</b> &#8212; ok</p>]]></description>
  </item>
  <item>
    <title>Newest &#x2603;</title>
    <guid>ep-2</guid>
    <pubDate>Tue, 30 Sep 2026 10:00:00 GMT</pubDate>
    <itunes:duration>1:02:03</itunes:duration>
    <enclosure type="audio/mpeg" url='https://cdn.example.com/2.mp3?a=1&amp;b=2'/>
  </item>
  <item><title>No audio</title><guid>ep-3</guid></item>
</channel></rss>`
