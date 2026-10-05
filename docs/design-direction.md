# Design Direction
Written 2026-09-30 · adapted from the anti-default-design method (no dice roll; structure chosen from the brief)
Inspiration: Lina Stores (linastores.co.uk: awning stripes with one sign) and London street nameplates (David Kindersley's lettering)

Register (from the brief, before any layout decisions). Since 2026-10-02 a Mediterranean × London hybrid:
- Materials: London enamel street-name signs, hand-painted blue-and-white Mediterranean tiles, a pillar box, white sash window frames, a kitchen notebook and the pencil notes stuck to the fridge
- Hues:      enamel-sign navy, tile blue, pillar-box red, sash-frame white
- Lettering: handwritten fridge notes and notice-board scrawl, set against a bookish text face like a well-thumbed paperback, with geometric street-sign capitals for the house name and buttons
- Voice:     the housemates themselves, direct and a bit wry, like a note left on the kitchen table. Never salesy, never "coliving brand"

Concept: the application is a postcard to the house. The photo of the back of the house is the picture side; the form is the back, with a message side ("Dear Olive Grove,", signed "Love," with the guest's name) and an address side (stamp, postmark, "To: The Olive Grove", reply-to and dates).

## Contract
Fonts:     the street-nameplate face (`--font-plate`) for the nameplate, headings and section titles: Marcellus for now, standing in for Kindersley's street-sign lettering until a licensed webfont is chosen; Literata for body text, labels and inputs; Josefin Sans Bold, uppercase and tracked, for the top-bar wordmark, nav and buttons. No handwriting faces. Never Inter, Roboto, Geist or the system stack.
Palette:
- `--paper`  #ffffff       sash-frame white (the postcard and cards)
- The page background is plain `--paper`. The old plaster wall photo is gone.
- `--ink`    #16325c       enamel-sign navy, used for all text
- `--ink-soft` #4f6380     secondary text
- `--rule`   #c9d3e0       pale blue-grey, used for field borders and dividers
- `--tile`   #2f6fae       tile blue, used for the tile strips, annotations, postmark, focus rings and the checkbox tick
- `--pillar` #c2402a       pillar-box red, used only for link hover
- `--card`   #fcfbf8       the postcard's card stock, a touch off pure white
- Dark mode: paper #0f1a2b, wall #0c1524, card #132036, ink #e8edf5, ink-soft #a3b1c6, rule #2c3b52, tile #6fa3d6, pillar #e0634c
Shape:     no uniform rounded rectangles. Inputs and textareas are boxed fields (1px rule border, 2px radius, slightly see-through white, placeholder hints). Buttons have a 2px radius, a solid navy fill and street-sign capitals with an arrow. The banner photo is full-bleed.
Space:     roomy, single column on phones; the postcard is at most 54rem wide and centred.
Signature: a navy top bar with the wordmark (`SiteBar`). Home and login: tile-blue and white awning stripes fill the page (`.awning`), with one navy-edged white panel (`.awning-panel`) holding the nameplate. The nameplate (`Nameplate`, `.street-sign`) is a London street sign: carved capitals, navy keyline in a white margin, "Finsbury Park" in red beneath, always white even in dark mode. Dashboard: the awning's scalloped edge hangs under the top bar (`.awning-edge`); section titles in nameplate capitals (`.section-title`); cards edged in 2px navy. Apply: the nameplate on the house-photo banner, a strip of awning below, then the postcard back (dashed divider, stamp and tile-blue postmark, tick box and send button inside the address side).
Mobile:    phone-first. Heading, then the postcard back with its two sides stacked and split by a horizontal rule. From 768px the back splits into two columns.

Avoid (default fingerprint): cream or yellowed backgrounds, italic accent words in headings, fleurons and ornaments, pill buttons, rounded cards with soft shadows, hover lift, indigo or violet accents, numbered section labels, a centred hero with feature cards.

## History
- 2026-10-05: amended. The user found the site "scruffy and 90s geocities" and three clean mockups "too generic/LLM generated"; from nine mockups based on real sites they chose Lina Stores' awning stripes with one sign, plus a real street-sign typeface. Plaster wall, olive sprigs, Shantell Sans and Playfair removed.
- 2026-10-02: amended to match the user's own mockup: top bar, shorter banner, tile band removed, centred Playfair heading, boxed inputs, navy button, olive sprigs and leaf shadows, warmer plaster.
- 2026-10-02: amended. Page background became a white plaster wall photo; postcard lost its hard offset shadow for a soft one.
- 2026-10-02: amended. Pixelated full-page background photo removed as it looked like scraps on a busy backdrop; photo became a banner with the sign mounted on it, page background became textured limewash, tick box and button moved into the postcard.
- 2026-10-02: amended. Mediterranean × London hybrid ("street sign and tiles", chosen from four mockups): navy, tile blue and pillar-box red replace the green, ochre and orange; heading became a street-name sign; tile strips added.
- 2026-09-30: amended. Picture side removed; the house photo now appears only as the stamp (112 × 136).
- 2026-09-30: amended. Photo annotations removed at the user's request; the form became a postcard back.
- 2026-09-30: replaced the Fraunces, olive-accent and cream version, which the user found clichéd.
