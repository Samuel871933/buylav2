import { describe, it, expect } from 'vitest';
import { buildAffiliateRedirectUrl, cleanProductUrl, type AffiliateProgramInfo } from '../affiliate-url';

// ---------------------------------------------------------------------------
// buildAffiliateRedirectUrl
// ---------------------------------------------------------------------------

describe('buildAffiliateRedirectUrl', () => {
  const baseProgram: AffiliateProgramInfo = {
    url_template: '{BASE_URL}?tag={AFFILIATE_TAG}&subid={SUB_ID}',
    base_url: 'https://www.amazon.fr',
    sub_id_param: 'subid',
    sub_id_format: 'buyla_{REF}',
    api_key: 'buyla-tag-20',
    notes: null,
  };

  it('replaces all placeholders correctly', () => {
    const result = buildAffiliateRedirectUrl(baseProgram, 'ABC123');

    expect(result.url).toBe('https://www.amazon.fr?tag=buyla-tag-20&subid=buyla_ABC123');
    expect(result.subIdSent).toBe('buyla_ABC123');
  });

  it('handles missing sub_id_format (falls back to {REF})', () => {
    const program = { ...baseProgram, sub_id_format: null };
    const result = buildAffiliateRedirectUrl(program, 'REF456');

    expect(result.url).toContain('subid=REF456');
    expect(result.subIdSent).toBe('REF456');
  });

  it('returns null subIdSent when no sub_id_param', () => {
    const program = { ...baseProgram, sub_id_param: null };
    const result = buildAffiliateRedirectUrl(program, 'ABC123');

    expect(result.subIdSent).toBeNull();
  });

  it('handles AFF_ID placeholder', () => {
    const program: AffiliateProgramInfo = {
      url_template: 'https://network.com/click?aff={AFF_ID}',
      base_url: null,
      sub_id_param: null,
      sub_id_format: null,
      api_key: 'pub-12345',
      notes: null,
    };
    const result = buildAffiliateRedirectUrl(program, 'REF');
    expect(result.url).toBe('https://network.com/click?aff=pub-12345');
  });

  it('handles MID placeholder from notes', () => {
    const program: AffiliateProgramInfo = {
      url_template: 'https://track.com/?mid={MID}&aff={AFF_ID}',
      base_url: null,
      sub_id_param: null,
      sub_id_format: null,
      api_key: 'aff99',
      notes: '54321',
    };
    const result = buildAffiliateRedirectUrl(program, 'X');
    expect(result.url).toBe('https://track.com/?mid=54321&aff=aff99');
  });

  it('handles PRODUCT_URL placeholder with encoding', () => {
    const program: AffiliateProgramInfo = {
      url_template: 'https://redirect.com/?url={PRODUCT_URL}&aff={AFF_ID}',
      base_url: null,
      sub_id_param: null,
      sub_id_format: null,
      api_key: 'aff1',
      notes: null,
    };
    const result = buildAffiliateRedirectUrl(program, 'REF', 'https://shop.com/product?id=123');
    expect(result.url).toContain(encodeURIComponent('https://shop.com/product?id=123'));
  });

  it('handles empty productUrl gracefully', () => {
    const program: AffiliateProgramInfo = {
      url_template: 'https://redirect.com/?url={PRODUCT_URL}',
      base_url: null,
      sub_id_param: null,
      sub_id_format: null,
      api_key: null,
      notes: null,
    };
    const result = buildAffiliateRedirectUrl(program, 'REF');
    expect(result.url).toBe('https://redirect.com/?url=');
  });
});

// ---------------------------------------------------------------------------
// cleanProductUrl
// ---------------------------------------------------------------------------

describe('cleanProductUrl', () => {
  describe('Amazon URLs', () => {
    it('extracts /dp/ASIN from complex Amazon URL', () => {
      const url = 'https://www.amazon.fr/Produit-Super/dp/B09ABC1234/ref=sr_1_1?keywords=test&qid=1234';
      expect(cleanProductUrl(url, 'amazon')).toBe('https://www.amazon.fr/dp/B09ABC1234');
    });

    it('extracts /gp/product/ASIN', () => {
      const url = 'https://www.amazon.fr/gp/product/B09XYZ5678?ref=ppx_pop';
      expect(cleanProductUrl(url, 'amazon')).toBe('https://www.amazon.fr/gp/product/B09XYZ5678');
    });

    it('returns as-is when no ASIN found', () => {
      const url = 'https://www.amazon.fr/some-random-page';
      expect(cleanProductUrl(url, 'amazon')).toBe(url);
    });
  });

  describe('Generic merchant URLs', () => {
    it('strips UTM params', () => {
      const url = 'https://shop.com/product?id=123&utm_source=google&utm_medium=cpc&utm_campaign=sale';
      const cleaned = cleanProductUrl(url, 'direct');
      expect(cleaned).toBe('https://shop.com/product?id=123');
    });

    it('strips gclid and fbclid', () => {
      const url = 'https://shop.com/product?id=123&gclid=abc&fbclid=def';
      const cleaned = cleanProductUrl(url, 'direct');
      expect(cleaned).toBe('https://shop.com/product?id=123');
    });

    it('strips ref and tag params', () => {
      const url = 'https://shop.com/product?id=123&ref=abc&tag=xyz';
      const cleaned = cleanProductUrl(url, 'direct');
      expect(cleaned).toBe('https://shop.com/product?id=123');
    });

    it('preserves non-tracking params', () => {
      const url = 'https://shop.com/product?id=123&color=red&size=M';
      const cleaned = cleanProductUrl(url, 'direct');
      expect(cleaned).toBe('https://shop.com/product?id=123&color=red&size=M');
    });

    it('handles URL with no query params', () => {
      const url = 'https://shop.com/product/123';
      expect(cleanProductUrl(url, 'direct')).toBe('https://shop.com/product/123');
    });

    it('handles invalid URL gracefully', () => {
      const url = 'not-a-url';
      expect(cleanProductUrl(url, 'direct')).toBe('not-a-url');
    });
  });
});
