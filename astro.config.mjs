// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// Dynamically determine the site URL
const getSiteUrl = () => {
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://au.crazyvegas.com';
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://au.crazyvegas.com'; // Fallback for local dev
};

// Fetch redirects from the WordPress CVC Redirects plugin at build time.
// On any failure we return {} and let the static vercel.json redirects act as the safety net.
const getRedirects = async () => {
  const endpoint =
    'https://wordpress-1164434-6467266.cloudwaysapps.com/wp-json/cvc/v1/redirects';

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`WP redirects responded ${res.status}`);

    const list = await res.json();
    if (!Array.isArray(list)) throw new Error('WP redirects payload is not an array');

    /** @type {Record<string, any>} */
    const redirects = {};
    for (const r of list) {
      if (!r || !r.source || !r.destination) continue; // skip incomplete entries
      redirects[r.source] = {
        status: r.permanent ? 301 : 302,
        destination: r.destination,
      };
    }

    console.log(`[redirects] Loaded ${Object.keys(redirects).length} redirects from WordPress.`);
    return redirects;
  } catch (err) {
    console.warn(
      `[redirects] Could not load WP redirects (${err instanceof Error ? err.message : err}). ` +
      `Falling back to vercel.json.`
    );
    return {};
  }
};

const wpRedirects = await getRedirects();

// https://astro.build/config
export default defineConfig({
  site: getSiteUrl(),
  build: {
    inlineStylesheets: 'always',
  },
  output: 'static',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react()],

  trailingSlash: 'always',
  redirects: wpRedirects,
  image: {
    domains: [
      'au.crazyvegas.com',
      'wordpress-1164434-6467266.cloudwaysapps.com',
      'www.wordpress-1164434-6467266.cloudwaysapps.com',
      'secure.gravatar.com',
      'ui-avatars.com'
    ]
  },
});