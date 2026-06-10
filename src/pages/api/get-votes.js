export const prerender = false;
import { createClient } from 'redis';

// Reuse one connection across warm invocations instead of
// connecting/disconnecting on every request.
let client;
async function getClient() {
    const redisUrl = import.meta.env.REDIS_URL || process.env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL is missing');

    if (!client) {
        client = createClient({ url: redisUrl });
        client.on('error', (e) => console.error('Redis Client Error:', e));
    }
    if (!client.isOpen) await client.connect();
    return client;
}

export async function GET({ request }) {
    const url = new URL(request.url);

    // Batched: ?ids=joka-casino,rocket-casino  |  Single (old): ?id=joka-casino
    const isBatch = url.searchParams.has('ids');
    const idsParam = url.searchParams.get('ids') || url.searchParams.get('id') || '';
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (ids.length === 0) {
        return new Response(JSON.stringify({ error: 'No ID provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const redis = await getClient();

        // Fetch every up/down key in ONE round trip with MGET.
        const keys = [];
        for (const id of ids) {
            keys.push(`casino_${id}_up`, `casino_${id}_down`);
        }
        const values = await redis.mGet(keys);

        const result = {};
        ids.forEach((id, i) => {
            result[id] = {
                upVotes: parseInt(values[i * 2]) || 0,
                downVotes: parseInt(values[i * 2 + 1]) || 0,
            };
        });

        // Single-id calls get the old flat shape; batched calls get a map.
        const body = isBatch ? result : result[ids[0]];

        return new Response(JSON.stringify(body), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('Redis Error:', error);
        return new Response(JSON.stringify({ error: 'Database error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}