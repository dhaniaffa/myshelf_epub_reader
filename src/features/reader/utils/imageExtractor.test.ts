import { describe, expect, it } from 'vitest';

import { extractReaderImageInfo } from './imageExtractor';

describe('extractReaderImageInfo (src/features/reader/utils/imageExtractor.ts)', () => {
  it('returns null for null target or non-element target', () => {
    expect(extractReaderImageInfo(null)).toBeNull();
    const textNode = document.createTextNode('sample text');
    expect(extractReaderImageInfo(textNode)).toBeNull();
  });

  it('extracts info from a standard HTML <img> element', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/cover.jpg';
    img.alt = 'Cover Buku';

    const info = extractReaderImageInfo(img);
    expect(info).not.toBeNull();
    expect(info?.src).toBe('https://example.com/cover.jpg');
    expect(info?.alt).toBe('Cover Buku');
  });

  it('extracts info when clicking an element nested inside <img> parent', () => {
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = 'https://example.com/chart.png';
    figure.appendChild(img);

    const info = extractReaderImageInfo(img);
    expect(info).toEqual({
      src: 'https://example.com/chart.png',
      alt: '',
    });
  });

  it('extracts info from SVG <image> with href or xlink:href', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', 'https://example.com/diagram.svg');
    image.setAttribute('aria-label', 'Diagram Alir');
    svg.appendChild(image);

    const info = extractReaderImageInfo(image);
    expect(info).toEqual({
      src: 'https://example.com/diagram.svg',
      alt: 'Diagram Alir',
    });
  });

  it('extracts info when clicking <svg> that wraps an <image>', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('xlink:href', 'https://example.com/illustration.jpg');
    image.setAttribute('alt', 'Ilustrasi Bab');
    svg.appendChild(image);

    const info = extractReaderImageInfo(svg);
    expect(info).toEqual({
      src: 'https://example.com/illustration.jpg',
      alt: 'Ilustrasi Bab',
    });
  });

  it('serializes standalone vector <svg> to data URL', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-label', 'Grafik Statistik');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '40');
    svg.appendChild(circle);

    const info = extractReaderImageInfo(svg);
    expect(info).not.toBeNull();
    expect(info?.src).toContain('data:image/svg+xml;charset=utf-8,');
    expect(info?.alt).toBe('Grafik Statistik');
  });

  it('extracts info from <picture> containing <img>', () => {
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.srcset = 'https://example.com/large.webp';
    const img = document.createElement('img');
    img.src = 'https://example.com/fallback.jpg';
    img.alt = 'Foto Pemandangan';
    picture.appendChild(source);
    picture.appendChild(img);

    const info = extractReaderImageInfo(picture);
    expect(info).toEqual({
      src: 'https://example.com/fallback.jpg',
      alt: 'Foto Pemandangan',
    });
  });

  it('extracts info when clicking a <figure> or <a> wrapper container that wraps an <img>', () => {
    const figure = document.createElement('figure');
    figure.className = 'cover-wrapper';
    const link = document.createElement('a');
    link.href = '#';
    const img = document.createElement('img');
    img.src = 'https://example.com/wrapped-photo.jpg';
    img.alt = 'Foto Terbungkus';
    link.appendChild(img);
    figure.appendChild(link);

    // Clicking the figure wrapper itself
    const infoFromFigure = extractReaderImageInfo(figure);
    expect(infoFromFigure).toEqual({
      src: 'https://example.com/wrapped-photo.jpg',
      alt: 'Foto Terbungkus',
    });

    // Clicking the anchor wrapper itself
    const infoFromLink = extractReaderImageInfo(link);
    expect(infoFromLink).toEqual({
      src: 'https://example.com/wrapped-photo.jpg',
      alt: 'Foto Terbungkus',
    });
  });

  it('returns null for non-image elements like <div> or <p>', () => {
    const div = document.createElement('div');
    div.textContent = 'Paragraf biasa';
    expect(extractReaderImageInfo(div)).toBeNull();
  });
});
