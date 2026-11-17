# Classic Analytics for YouTube Studio

Hate the new **Insights** page in YouTube Studio? This brings back the **old Analytics page**: Overview, Content, Audience, Realtime, all of it.

It's not a remake. YouTube still has the old Analytics page, it's just hidden. This extension switches it back on.

## ⬇️ Download

### **[Click here to download](https://github.com/er6n/classic-studio-analytics/releases/latest/download/classic-studio-analytics.zip)**

## How to install (takes 1 minute)

Works in **Chrome**, **Edge**, **Brave**, and **Opera**.

1. **Unzip** the file you downloaded. (Right-click it → **Extract All** on Windows, or double-click it on Mac.)
2. Open Chrome and go to **`chrome://extensions`** (copy that into the address bar and press Enter).
3. Turn on **Developer mode** (the switch in the top-right corner).
4. Click **Load unpacked** and pick the **`classic-studio-analytics`** folder you just unzipped.
5. Open **[YouTube Studio](https://studio.youtube.com)** and click **Analytics**. Done ✅

> ⚠️ **Don't delete or move the unzipped folder** after installing. Chrome loads the extension from that folder, so put it somewhere you'll keep, like Documents.

## Turning it off

Click the puzzle piece 🧩 in Chrome's toolbar → **Classic Analytics** → untick the box → **Save & reload Studio**.

Or remove it completely from `chrome://extensions`.

## FAQ

**Is it safe? Can my channel get in trouble?**
It only changes which Analytics layout Studio shows **you**, in your own browser. It doesn't collect data, send anything anywhere, or touch your account. It only runs on `studio.youtube.com`. All the code is in the [`extension`](extension) folder if you want to check.

**Chrome says "Disable developer mode extensions"?**
That's normal for extensions installed this way. Click the ✕ to dismiss it.

**It stopped working / I still see Insights**
YouTube might have changed something. [Open an issue](https://github.com/er6n/classic-studio-analytics/issues) and include this:
click the extension → **Copy debug info**, then paste it into the issue. It doesn't include your channel ID or any stats.

**How does it work?**
YouTube Studio decides which design to show using internal on/off switches. The new Insights page is behind one called `enable_analytics_hub_web`. The extension turns that switch off before Studio loads, and sends the new Insights links to the classic Analytics pages.

---

Not affiliated with YouTube or Google.
