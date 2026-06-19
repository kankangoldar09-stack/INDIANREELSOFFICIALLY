const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const decodeHTMLEntities = (str: string) =>
  str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
     .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');

// Extract product name from URL slug — works 100% offline
const nameFromSlug = (parsed: URL): string => {
  const host = parsed.hostname.replace('www.', '');
  const path = decodeURIComponent(parsed.pathname);

  if (host.includes('flipkart')) {
    // /category/brand-product-name/p/ITEMID
    const segs = path.split('/').filter(s => s.length > 3 && s !== 'p' && !/^[A-Z0-9]{8,}$/.test(s) && !s.includes('?'));
    if (segs.length > 0) return segs[segs.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  if (host.includes('amazon')) {
    const m = path.match(/\/([^/]+)\/dp\//);
    if (m) return m[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  if (host.includes('meesho')) {
    const segs = path.split('/').filter(Boolean);
    if (segs[0]) return segs[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  if (host.includes('myntra')) {
    const segs = path.split('/').filter(Boolean);
    if (segs[1]) return `${segs[0]} ${segs[1]}`.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  if (host.includes('ajio')) {
    const segs = path.split('/').filter(Boolean);
    const slug = segs.find(s => s.length > 5 && s.includes('-'));
    if (slug) return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  // Generic
  const segs = path.split('/').filter(s => s.length > 3 && s.includes('-'));
  const last = segs[segs.length - 1];
  return last ? last.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim() : '';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: 'url required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    let parsed: URL;
    try { parsed = new URL(url); }
    catch { return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }); }

    const host = parsed.hostname.replace('www.', '');

    // Always start with slug-based name (guaranteed)
    const slugName = nameFromSlug(parsed);
    let name = slugName;
    let image = '';
    let price = '';
    let source = 'slug';

    // ── Strategy 1: Microlink API (best for e-commerce) ──
    try {
      const mlRes = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(url)}&palette=false&audio=false&video=false&iframe=false`,
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(9000) }
      );
      if (mlRes.ok) {
        const ml = await mlRes.json();
        const d = ml?.data;
        if (d) {
          if (d.title) {
            name = d.title
              .replace(/\s*[|\-–]\s*(Flipkart|Amazon\.in|Amazon|Meesho|Myntra|Ajio|Buy online|Online Shopping).*$/i, '')
              .trim();
          }
          if (d.image?.url) image = d.image.url;
          if (d.description) {
            // Try to extract price from description
            const priceMatch = d.description.match(/₹\s*([\d,]+)/);
            if (priceMatch) price = `₹${priceMatch[1]}`;
          }
          source = 'microlink';
        }
      }
    } catch (e) {
      console.warn('microlink failed:', e);
    }

    // ── Strategy 2: jsonlink.io (fallback OG extractor) ──
    if (!image && source !== 'microlink') {
      try {
        const jlRes = await fetch(
          `https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(7000) }
        );
        if (jlRes.ok) {
          const jl = await jlRes.json();
          if (jl.title && !name) name = jl.title.replace(/\s*[|\-–].*$/i, '').trim();
          if (jl.images?.[0]) image = jl.images[0];
          source = 'jsonlink';
        }
      } catch (e) {
        console.warn('jsonlink failed:', e);
      }
    }

    // ── Platform-specific price extraction hints ──
    if (!price) {
      const q = parsed.searchParams.get('price') || parsed.searchParams.get('selling_price');
      if (q) price = `₹${q}`;
    }

    // Fallback: use slug name if everything failed
    if (!name) name = slugName;

    return new Response(
      JSON.stringify({ name, image, price, platform: host, source }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    console.error('product-scraper error:', e);
    return new Response(
      JSON.stringify({ name: '', image: '', price: '', error: e.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

