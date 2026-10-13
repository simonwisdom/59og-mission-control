import { describe, expect, it } from "vitest";
import { firstPhoto, pagePhotos, removePhoto } from "./page-photos";

const page = "Intro\n\n![The room](/page-images/4)\n\nText ![Garden](/page-images/7) and ![](https://example.com/x.jpg)\n\n![Again](/page-images/4)\n";

describe("pagePhotos", () => {
  it("lists uploaded photos once each, in order, ignoring outside images", () => {
    expect(pagePhotos(page)).toEqual([
      { alt: "The room", url: "/page-images/4" },
      { alt: "Garden", url: "/page-images/7" },
    ]);
  });

  it("gives the first photo, or null when there is none", () => {
    expect(firstPhoto(page)).toBe("/page-images/4");
    expect(firstPhoto("No photos here")).toBeNull();
  });
});

describe("removePhoto", () => {
  it("takes out every copy of that photo and leaves the rest", () => {
    expect(removePhoto(page, "/page-images/4")).toBe("Intro\n\nText ![Garden](/page-images/7) and ![](https://example.com/x.jpg)\n\n");
  });

  it("doesn't touch a photo whose number only starts the same", () => {
    expect(removePhoto("![a](/page-images/45)", "/page-images/4")).toBe("![a](/page-images/45)");
  });
});
