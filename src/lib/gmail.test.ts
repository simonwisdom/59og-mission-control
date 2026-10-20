import { describe, expect, it } from "vitest";
import { MAX_PER_SYNC, SCOPE, authUrl, historyChanges, htmlToText, parseMessage, pkcePair, tidy } from "./gmail";
import { createHash } from "node:crypto";

// A message as Gmail's messages.get gives it with format=raw
const gmailMessage = (rfc822: string, labelIds = ["INBOX", "UNREAD"]) => ({
  id: "m1",
  threadId: "t1",
  labelIds,
  internalDate: String(Date.parse("2026-10-19T08:30:00Z")),
  raw: Buffer.from(rfc822.replace(/\n/g, "\r\n")).toString("base64url"),
});

const multipart = `From: "Thames Water" <bills@thameswater.co.uk>
To: House <house@example.com>, Rita <rita@example.com>
Subject: =?UTF-8?Q?Your_bill_=E2=80=94_October?=
Date: Sun, 1 Jan 2006 00:00:00 +0000
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="b1"

--b1
Content-Type: multipart/alternative; boundary="b2"

--b2
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: quoted-printable

Your bill is =C2=A342.10.
Pay by 1 Nov.
--b2
Content-Type: text/html; charset=utf-8

<p>Your bill is &pound;42.10.</p>
--b2--
--b1
Content-Type: application/pdf
Content-Disposition: attachment; filename="bill.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQK
--b1--
`;

describe("parseMessage", () => {
  it("reads sender, recipients, subject, text and attachments from the raw mail", async () => {
    const email = await parseMessage(gmailMessage(multipart));
    expect(email).toMatchObject({
      gmailId: "m1",
      threadId: "t1",
      fromName: "Thames Water",
      fromAddress: "bills@thameswater.co.uk",
      to: "House <house@example.com>, Rita <rita@example.com>",
      subject: "Your bill — October",
      body: "Your bill is £42.10.\nPay by 1 Nov.",
      attachments: [{ filename: "bill.pdf", mimeType: "application/pdf", size: 9 }],
      labels: ["INBOX", "UNREAD"],
    });
  });

  it("dates a mail by when Gmail got it, not by the Date header a sender can set", async () => {
    const email = await parseMessage(gmailMessage(multipart));
    expect(email?.sentAt.toISOString()).toBe("2026-10-19T08:30:00.000Z");
  });

  it("keeps the raw bytes so the fields can be worked out again", async () => {
    const email = await parseMessage(gmailMessage(multipart));
    expect(email?.raw?.toString()).toContain("Subject: =?UTF-8?Q?Your_bill");
  });

  it("turns an HTML-only mail into text", async () => {
    const html = `From: a@example.com
Subject: Hi
Content-Type: text/html; charset=utf-8

<html><head><style>p{color:red}</style></head><body><p>Hello&nbsp;there</p><div>Line two<br>three</div><script>alert(1)</script></body></html>`;
    const email = await parseMessage(gmailMessage(html));
    expect(email?.body).toBe("Hello there\n\nLine two\nthree");
    expect(email?.fromName).toBe("a@example.com");
  });

  it("skips spam, trash, drafts and chat", async () => {
    for (const label of ["SPAM", "TRASH", "DRAFT", "CHAT"]) {
      expect(await parseMessage(gmailMessage(multipart, [label]))).toBeNull();
    }
  });

  it("gives a mail with no subject a placeholder", async () => {
    const email = await parseMessage(gmailMessage("From: a@example.com\n\nJust text"));
    expect(email?.subject).toBe("(no subject)");
    expect(email?.body).toBe("Just text");
  });
});

describe("htmlToText and tidy", () => {
  it("drops hidden parts and tags and decodes entities", () => {
    expect(htmlToText("<!-- x --><p>Fish &amp; chips &#163;5 &#x20AC;6</p><title>t</title>")).toBe("Fish & chips £5 €6");
  });

  it("strips control characters and direction marks and collapses blank lines", () => {
    expect(tidy("a‮\u0007b\r\n\r\n\r\n\r\nc  d ")).toBe("ab\n\nc d");
  });
});

describe("historyChanges", () => {
  it("collects new, deleted and relabelled messages and moves to the latest history id", () => {
    const changes = historyChanges(
      [
        { id: "10", messagesAdded: [{ message: { id: "a", labelIds: ["INBOX"] } }, { message: { id: "s", labelIds: ["SPAM"] } }] },
        { id: "11", messagesDeleted: [{ message: { id: "old" } }] },
        { id: "12", labelsRemoved: [{ message: { id: "a", labelIds: ["UNREAD"] } }] },
        { id: "13", messagesAdded: [{ message: { id: "a", labelIds: ["INBOX"] } }] },
      ],
      "20",
    );
    expect(changes.added).toEqual(["a"]);
    expect(changes.deleted).toEqual(["old"]);
    expect(changes.relabelled).toEqual(new Map([["a", ["UNREAD"]]]));
    expect(changes.historyId).toBe("20");
  });

  it("stops at a whole record once a sync has enough messages, and carries on from there", () => {
    const records = Array.from({ length: MAX_PER_SYNC + 5 }, (_, i) => ({
      id: String(100 + i),
      messagesAdded: [{ message: { id: `m${i}` } }],
    }));
    const changes = historyChanges(records, "999");
    expect(changes.added).toHaveLength(MAX_PER_SYNC);
    expect(changes.historyId).toBe(String(100 + MAX_PER_SYNC - 1));
  });
});

describe("sign-in", () => {
  it("asks only for read access, with PKCE and a refresh token", () => {
    const url = new URL(authUrl("client", "https://house.example/dashboard/email/callback", "st", "ch"));
    expect(url.searchParams.get("scope")).toBe(SCOPE);
    expect(SCOPE).toBe("https://www.googleapis.com/auth/gmail.readonly");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("access_type")).toBe("offline");
  });

  it("makes a challenge that is the SHA-256 of the verifier", () => {
    const { verifier, challenge } = pkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });
});
