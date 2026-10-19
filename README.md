# Little Surprise (MVP)

A builder for small "surprise" gift websites: a cute question with yes/no buttons, a pleading screen if they press no, then a love letter with a photobooth strip. You fill in a form and get one link to send.

## What the reference product does

**TikTok, @fayy.creates (Aug 2025, about 43K likes):** a demo of a pink Canva website.
1. "I made you a surprise, my love / would you like to see it?" with the buttons **YES BABY** and **NO THANKS**
2. Pressing no shows a sad mascot: "I promise you'll like it / i made it only for you" with an **ANOTHER CHANCE** button
3. Pressing yes opens "Happy Monthsary, my love!": a photo strip on the left and a long letter on lined paper

**Ko-fi listing "Surprise Message" (Fay.Creates):** sold as an editable Canva website template, pay what you want from $3. Other themes in the shop cost $5 to $7.50 (Sweet Blue, Spiderman, Virtual Gifts). The buyer edits it in Canva, publishes it as a Canva website and sends the link. It's marketed for anniversaries, monthsaries, birthdays, Valentine's Day, saying sorry, long distance and "just because".

**The gap this MVP fills:** the buyer still has to edit in Canva, on a laptop, and publish it themselves. Here the site builds itself from a form, works on a phone, and is ready to share right away.

## What's in the MVP

| Page | URL | What it does |
|---|---|---|
| Landing | `/` | Hero with a working demo, how it works, themes, occasions, pricing |
| Builder | `/#create` | Form plus a live phone/laptop preview, photo upload, "Create my link" |
| Sample | `/#demo` | The sample gift, full screen |
| Gift | `/#g=<code>` | What the person receiving the link sees |

- **4 themes** (Strawberry Milk, Sweet Blue, Matcha Picnic, Midnight Letter), **3 mascot choices** (original SVG cat or bear, or none)
- **Two "no" modes:** the pleading screen from the reference, or a button that runs away while "yes" gets bigger
- **Up to 4 photos**, center-cropped and shrunk in the browser to 240×180 JPEG
- **No backend.** All the gift data is compressed (deflate + base64url) into the part of the link after `#`. Browsers never send that part to a server, so nothing is stored anywhere and links never expire.
- Drafts are saved in the browser's localStorage. User text is escaped, and incoming link data is validated before it's shown.

## Files

```
site/index.html     the page to deploy
site/styles.css     all styles (the site and the gift themes)
site/app.js         router, landing page, builder, gift viewer, link encoding
site/artifact.html  wrapper used only for the claude.ai preview
```

## Run it locally

```bash
npx serve site
```

Then open the address it prints. Any static file server works.

## Deploy

It's a plain static folder, so drag `site/` into Netlify Drop, or run:

```bash
npx vercel deploy site --prod
```

The gift links use whatever domain you deploy to.

## Known limits

- With 4 real photos a link is roughly 20 to 60 KB. WhatsApp and iMessage handle that, but some apps cut long links. The builder warns when a link is over 40 KB.
- To change a gift after sending it, you have to make a new link.
- Every link on the domain gets the same preview card ("Someone made you a little surprise ♡").

## Next steps (roughly in priority order)

1. **Short links plus storage** (for example Supabase): save the gift and photos, issue `/g/ana-7k2`. This removes the link-length limit, lets you edit after sending, and lets each gift have its own preview image.
2. **Payments** (Stripe or Lemon Squeezy) to unlock a Keepsake tier. The reference sells for $3 to $7.50, so $3 to $5 per gift fits.
3. **Background music** that starts when they press yes (browsers only play sound after a click, and yes is that click).
4. **"They said yes" notification** to the sender.
5. **More pages**: reasons I love you, a timeline, an open-when letter, a virtual gift box.
6. **Themed packs** (seasonal, fandom-style) to match the reference shop's range. Use original art, not licensed characters.
