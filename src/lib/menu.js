const APP_ID = "6467266"
const wpDomain = `https://wordpress-1164434-${APP_ID}.cloudwaysapps.com`
const wpUrl = `${wpDomain}/graphql`

const safeHeaders = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

export function cleanMenuUrl(url = "") {
    if (!url) return "/"
    let clean = url
        .replace(/https?:\/\/(www\.)?casinous\.com/gi, "")
        .replace(/https?:\/\/(www\.)?au\.crazyvegas\.com/gi, "")
        .replace(/https?:\/+wordpress-[a-zA-Z0-9-]+\.cloudwaysapps\.com/gi, "")

    if (/^https?:\/\//i.test(clean)) return clean // external/affiliate link, leave alone
    if (!clean.startsWith("/")) clean = `/${clean}`
    return clean
}

function parseDescription(desc = "") {
    // Expecting something like: {"icon":"fa-dice","column":1}
    if (!desc) return {}
    try {
        return JSON.parse(desc)
    } catch (e) {
        return {}
    }
}

function buildMenuTree(items) {
    const map = new Map(
        items.map(i => [
            i.id,
            {
                id: i.id,
                databaseId: i.databaseId,
                label: i.label,
                url: cleanMenuUrl(i.url),
                cssClasses: i.cssClasses || [],
                meta: parseDescription(i.description),
                children: [],
            },
        ])
    )

    const tree = []
    for (const original of items) {
        const node = map.get(original.id)
        if (original.parentId && map.has(original.parentId)) {
            map.get(original.parentId).children.push(node)
        } else {
            tree.push(node)
        }
    }
    return tree
}

export async function getPrimaryMenu() {
    const response = await fetch(wpUrl, {
        method: "POST",
        headers: safeHeaders,
        body: JSON.stringify({
            query: `
                query GetPrimaryMenu {
                    menu(id: "primary-menu", idType: SLUG) {
                        menuItems(first: 200) {
                            nodes {
                                id
                                databaseId
                                label
                                url
                                parentId
                                cssClasses
                                description
                            }
                        }
                    }
                }
            `,
        }),
    })

    const contentType = response.headers.get("content-type")
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
        const errText = await response.text()
        console.error("❌ CLOUDWAYS BLOCKED MENU REQUEST.", errText.substring(0, 200))
        return []
    }

    const result = await response.json()

    if (result.errors) {
        console.error("❌ GRAPHQL MENU ERROR:", JSON.stringify(result.errors, null, 2))
        return []
    }

    const nodes = result?.data?.menu?.menuItems?.nodes
    if (!nodes) {
        console.error("❌ GraphQL succeeded, but menu items are missing.")
        return []
    }

    return buildMenuTree(nodes)
}