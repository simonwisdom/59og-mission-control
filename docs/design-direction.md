# Design Direction
Written 2026-09-30 · adapted from the anti-default-design method (no dice roll; structure chosen from the brief)
Inspiration: maggieappleton.com (hand-drawn annotations, notebook feel)

Register (from the brief, before any layout decisions):
- Materials: London stock brick, white-painted sash window frames, star jasmine climbing the back wall, a kitchen notebook and the pencil notes stuck to the fridge
- Hues:      jasmine-leaf green (deep, blue-leaning), stock-brick ochre and grey-brown, sash-frame white, the warm lamp-orange glowing through the back door
- Lettering: handwritten fridge notes and notice-board scrawl, set against a bookish text face like a well-thumbed paperback
- Voice:     the housemates themselves, direct and a bit wry, like a note left on the kitchen table. Never salesy, never "coliving brand"

Concept: the application is a postcard to the house. The photo of the back of the house is the picture side; the form is the back, with a message side (written on ruled lines, signed with the guest's name) and an address side (stamp, postmark, "To: The Olive Grove", reply-to and dates).

## Contract
Fonts:     Shantell Sans for headings (INFM ~30, BNCE 0) and for annotations (INFM 100, BNCE ~40); Literata for body text, labels and inputs. Never Inter, Roboto, Geist or the system stack on this page.
Palette:
- `--paper`  #ffffff       sash-frame white (page background; no cream or off-white)
- `--ink`    #1d3326       jasmine-leaf green, used for all text
- `--ink-soft` #55685c     secondary text
- `--rule`   #d9d3c7       stock-brick grey, used for ruled lines and borders
- `--brick`  #a8652f       stock-brick ochre, used for annotations and hand-drawn marks
- `--lamp`   #e8872b       lamp orange, used only for focus rings and the checkbox tick
- Dark mode: paper #142019, ink #e9ede6, ink-soft #a5b3a9, rule #33443a, brick #d99a62, lamp #f0a052
Shape:     no uniform rounded rectangles. Inputs are single ruled lines (bottom border only); textareas are ruled notebook paper. Buttons have a 2px radius and a solid ink fill. The photo has square corners.
Space:     roomy, single column on phones; the form sits on a 2rem line rhythm so the ruled lines line up.
Signature: the postcard back. A vertical rule splits message and address sides; a stamp cropped from the house photo with a perforated edge, and a brick-ochre postmark ring reading "THE OLIVE GROVE · LONDON".
Mobile:    phone-first. Heading, then the postcard back with its two sides stacked and split by a horizontal rule. From 768px the back splits into two columns.

Avoid (default fingerprint): cream backgrounds, italic accent words in headings, fleurons and ornaments, pill buttons, rounded cards with soft shadows, hover lift, indigo or violet accents, numbered section labels, a centred hero with feature cards.

## History
- 2026-09-30: amended. Picture side removed; the house photo now appears only as the stamp (112 × 136).
- 2026-09-30: amended. Photo annotations removed at the user's request; the form became a postcard back.
- 2026-09-30: replaced the Fraunces, olive-accent and cream version, which the user found clichéd.
