/**
 * Shared affiliate URL builder library.
 *
 * Generic (no Sequelize dependency) so it can be used by both the API
 * and the web front-end.
 */

// ── Types ──

export interface AffiliateProgramInfo {
  url_template: string;
  base_url: string | null;
  sub_id_param: string | null;
  sub_id_format: string | null;
  api_key: string | null;
  notes: string | null;
}

// ── buildAffiliateRedirectUrl ──

/**
 * Build the affiliate redirect URL from a program's url_template.
 *
 * Supported placeholders:
 *  {BASE_URL}       -> program.base_url
 *  {AFF_ID}         -> program.api_key  (publisher ID)
 *  {AFFILIATE_TAG}  -> alias for api_key
 *  {SUB_ID}         -> generated sub-ID for tracking
 *  {PRODUCT_URL}    -> encoded product URL (optional)
 *  {MID}            -> program.notes (merchant ID for some networks)
 */
export function buildAffiliateRedirectUrl(
  program: AffiliateProgramInfo,
  ambassadorRef: string,
  productUrl?: string,
): { url: string; subIdSent: string | null } {
  let subId: string | null = null;

  if (program.sub_id_param && ambassadorRef) {
    subId = (program.sub_id_format || '{REF}').replace('{REF}', ambassadorRef);
  }

  // When {PRODUCT_URL} starts the template, it's the base URL (use raw).
  // When embedded as a param (e.g. &p={PRODUCT_URL}), encode it.
  const resolvedProductUrl = productUrl || program.base_url || '';
  const templateStartsWithProduct = program.url_template.startsWith('{PRODUCT_URL}');

  let url = program.url_template
    .replace('{BASE_URL}', program.base_url || '')
    .replace('{AFFILIATE_TAG}', program.api_key || '')
    .replace('{AFF_ID}', program.api_key || '')
    .replace('{MID}', program.notes || '')
    .replace('{SUB_ID}', subId || '')
    .replace(
      '{PRODUCT_URL}',
      templateStartsWithProduct ? resolvedProductUrl : encodeURIComponent(resolvedProductUrl),
    );

  return { url, subIdSent: subId };
}

// ── cleanProductUrl ──

/** UTM & tracking params to strip from non-Amazon URLs. */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'ref',
  'tag',
]);

/**
 * Clean a merchant product URL by removing tracking parameters.
 *
 * - Amazon: extracts the canonical /dp/ASIN or /gp/product/ASIN path.
 * - Other merchants: strips UTM and common tracking query params.
 */
export function cleanProductUrl(url: string, network: string): string {
  if (network === 'amazon') {
    // Match /dp/ASIN or /gp/product/ASIN (ASIN = 10 alphanumeric chars)
    const match = url.match(/\/(dp|gp\/product)\/([A-Za-z0-9]{10})/);
    if (match) {
      return `https://www.amazon.fr/${match[1]}/${match[2]}`;
    }
    // If no ASIN found, return as-is
    return url;
  }

  // Generic merchant: strip tracking query params
  try {
    const parsed = new URL(url);

    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key)) {
        parsed.searchParams.delete(key);
      }
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}
