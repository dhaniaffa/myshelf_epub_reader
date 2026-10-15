const VOID_AND_SVG_TAGS = new Set([
  // HTML5 void tags (must not have closing tags per HTML5 spec)
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
  // Common SVG self-closing tags valid in inline HTML5 SVG context
  'path',
  'circle',
  'rect',
  'line',
  'polygon',
  'polyline',
  'ellipse',
  'use',
  'stop',
  'image',
  'feblend',
  'fecolormatrix',
  'fecomponenttransfer',
  'fecomposite',
  'feconvolvematrix',
  'fediffuselighting',
  'fedisplacementmap',
  'fedistantlight',
  'feflood',
  'fefunca',
  'fefuncb',
  'fefuncg',
  'fefuncr',
  'fegaussianblur',
  'feimage',
  'femerge',
  'femergenode',
  'femorphology',
  'feoffset',
  'fepointlight',
  'fespecularlighting',
  'fespotlight',
  'fetile',
  'feturbulence',
]);

/**
 * Fixes self-closing XHTML tags unsupported by HTML5 parser (such as <code class="w"/> or <a id="..."/>).
 * In iframe srcdoc mode (HTML parser), non-void self-closing tags are treated as unclosed opening tags,
 * wrapping the remainder of the chapter and breaking the layout.
 */
export function fixSelfClosingHtmlTags(html: string): string {
  return html.replace(
    /<([a-zA-Z0-9]+)((?:\s+[a-zA-Z0-9:_.-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+))?)*)\s*\/>/g,
    (match, tag, attrs) => {
      const lowerTag = tag.toLowerCase();
      if (VOID_AND_SVG_TAGS.has(lowerTag)) {
        return match;
      }
      return `<${tag}${attrs}></${tag}>`;
    }
  );
}
