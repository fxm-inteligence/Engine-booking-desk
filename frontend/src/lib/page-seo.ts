export interface PageSeo {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

const defaultTitle = typeof document === "undefined" ? "" : document.title;

function setMeta(attribute: "name" | "property", key: string, value: string | undefined): void {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (value === undefined) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
}

/** Writes what the opened Page says about itself into the document head. */
export function applyPageSeo(seo: PageSeo): void {
  if (typeof document === "undefined") return;
  document.title = seo.title ?? defaultTitle;
  setMeta("name", "description", seo.description);
  setMeta("property", "og:title", seo.title);
  setMeta("property", "og:description", seo.description);
  setMeta("property", "og:image", seo.image);
  setMeta("name", "robots", seo.noIndex ? "noindex, nofollow" : undefined);
}
