import type { ImageViewData } from '@/types';

/**
 * Resolves a potentially relative URL against an element document's baseURI.
 */
function resolveUrl(url: string, doc?: Document): string {
  if (!url) return '';
  // If already absolute or blob/data/tauri protocol
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    url.startsWith('tauri://') ||
    url.startsWith('asset://')
  ) {
    return url;
  }

  try {
    const baseUri = doc?.baseURI || (typeof window !== 'undefined' ? window.location.href : '');
    return new URL(url, baseUri).href;
  } catch {
    return url;
  }
}

/**
 * Extracts image metadata (src, alt) from a clicked/touched DOM target.
 * Supports HTML <img>, <picture>, SVG <image>, SVG vector graphics (<svg>),
 * and parent containers (<figure>, <a>, <div>, <p>) wrapping an image.
 */
export function extractReaderImageInfo(target: EventTarget | null): ImageViewData | null {
  if (!target || typeof target !== 'object' || (target as Node).nodeType !== 1) return null;

  const element = target as Element;
  const doc = element.ownerDocument;

  // 1. Direct HTML <img> element or ancestor/descendant <img>
  const img =
    element.closest('img') ||
    (element.tagName.toLowerCase() === 'img' ? (element as HTMLImageElement) : null) ||
    element.querySelector('img') ||
    element
      .closest('figure, picture, a, [class*="image"], [class*="cover"], [class*="figure"]')
      ?.querySelector('img');

  if (img) {
    const rawSrc = img.currentSrc || img.src || img.getAttribute('src');
    if (rawSrc) {
      return {
        src: resolveUrl(rawSrc, doc),
        alt: img.getAttribute('alt') || img.getAttribute('title') || '',
      };
    }
  }

  // 2. SVG <image> element
  const svgImage =
    element.closest('image') ||
    (element.tagName.toLowerCase() === 'image' ? (element as SVGImageElement) : null) ||
    element.querySelector('image') ||
    element.closest('svg')?.querySelector('image');

  if (svgImage) {
    const rawHref =
      svgImage.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
      svgImage.getAttribute('xlink:href') ||
      svgImage.getAttribute('href') ||
      (svgImage as SVGImageElement).href?.baseVal ||
      svgImage.getAttribute('src');

    if (rawHref) {
      return {
        src: resolveUrl(rawHref, doc),
        alt:
          svgImage.getAttribute('aria-label') ||
          svgImage.getAttribute('alt') ||
          svgImage.getAttribute('title') ||
          '',
      };
    }
  }

  // 3. SVG container (<svg>)
  const svg =
    element.closest('svg') ||
    (element.tagName.toLowerCase() === 'svg' ? (element as SVGSVGElement) : null);
  if (svg) {
    // 3a. If the SVG contains an <image>, prioritize extracting the embedded image file
    const nestedImage = svg.querySelector('image') || svg.getElementsByTagName('image')[0];
    if (nestedImage) {
      const rawHref =
        nestedImage.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
        nestedImage.getAttribute('xlink:href') ||
        nestedImage.getAttribute('href') ||
        (nestedImage as SVGImageElement).href?.baseVal ||
        nestedImage.getAttribute('src');

      if (rawHref) {
        return {
          src: resolveUrl(rawHref, doc),
          alt:
            nestedImage.getAttribute('aria-label') ||
            nestedImage.getAttribute('alt') ||
            svg.getAttribute('aria-label') ||
            '',
        };
      }
    }

    // 3b. Standalone SVG diagram or vector illustration: serialize to SVG data URL
    try {
      const serializer = new XMLSerializer();
      let svgMarkup = serializer.serializeToString(svg);

      if (!svgMarkup.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgMarkup = svgMarkup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const encoded = encodeURIComponent(svgMarkup)
        .replace(/%20/g, ' ')
        .replace(/%3D/g, '=')
        .replace(/%3A/g, ':')
        .replace(/%2F/g, '/');

      return {
        src: `data:image/svg+xml;charset=utf-8,${encoded}`,
        alt: svg.getAttribute('aria-label') || svg.getAttribute('title') || 'Diagram Vektor',
      };
    } catch {
      // ignore
    }
  }

  // 4. <picture> element wrapper
  const picture =
    element.closest('picture') ||
    (element.tagName.toLowerCase() === 'picture' ? (element as HTMLElement) : null);
  if (picture) {
    const nestedImg = picture.querySelector('img');
    if (nestedImg) {
      const rawSrc = nestedImg.currentSrc || nestedImg.src || nestedImg.getAttribute('src');
      if (rawSrc) {
        return {
          src: resolveUrl(rawSrc, doc),
          alt: nestedImg.getAttribute('alt') || nestedImg.getAttribute('title') || '',
        };
      }
    }
  }

  return null;
}
