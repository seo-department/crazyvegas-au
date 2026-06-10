// src/pages/llms.txt.ts
export const prerender = true;

const WP = 'https://wordpress-1164434-6467266.cloudwaysapps.com';
const SITE = 'https://au.crazyvegas.com';

export async function GET() {
  try {
    const res = await fetch(`${WP}/llms.txt`);
    if (!res.ok) return new Response('Not found', { status: 404 });

    let text = await res.text();
    text = text.replaceAll(WP, SITE); // rewrite backend links to your frontend

    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    return new Response('Error fetching llms.txt', { status: 500 });
  }
}