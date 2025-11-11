const { createCanvas } = require('canvas');
const db = require('./database/database');

class FamilyTreeGenerator {
    // Generate a grid-style family image. Shows usernames with relation labels under each name.
    // For performance, it limits the total displayed nodes and prefers cached usernames.
    static async generateTree(client, userId, relations) {
        // Config
        const MAX_NODES = 60; // cap nodes for performance
        const FETCH_LIMIT = 40; // max number of missing users to fetch
        const padding = 40;

        // Limit relations to cap
        const rels = relations.slice(0, MAX_NODES);
        const moreCount = Math.max(0, relations.length - rels.length);

        // Resolve display names efficiently: cache first, then fetch limited missing
        const display = {};
        const missing = [];
        for (const r of rels) {
            const id = r.relatedUserId;
            const cached = client.users.cache.get(id);
            if (cached) display[id] = `${cached.username}`;
            else missing.push(id);
        }

        // Limit fetches
        const toFetch = missing.slice(0, FETCH_LIMIT);
        await Promise.all(toFetch.map(async (id) => {
            try {
                const u = await client.users.fetch(id);
                display[id] = u.username;
            } catch {
                display[id] = `<@${id}>`;
            }
        }));

        // For any remaining missing beyond FETCH_LIMIT, fallback to mention text
        for (const id of missing.slice(FETCH_LIMIT)) display[id] = `<@${id}>`;

        // Fetch genders (up to FETCH_LIMIT) for labeling
        const genders = {};
        const genderIds = rels.map(r => r.relatedUserId).slice(0, FETCH_LIMIT);
        await Promise.all(genderIds.map(async (id) => {
            try {
                const row = await db.getUserData(id);
                genders[id] = row && row.gender ? row.gender : null;
            } catch {
                genders[id] = null;
            }
        }));

        // Layout grid
        const n = rels.length;
        const cols = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(n))));
        const rows = Math.ceil(n / cols);

        // Node box size
        const boxW = 220;
        const boxH = 70;
        const width = Math.max(600, cols * (boxW + padding) + padding);
        const height = Math.max(300, rows * (boxH + padding) + 220);

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#23272A';
        ctx.fillRect(0, 0, width, height);

        // Title / target at top center
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        const title = 'Family for ' + (client.users.cache.get(userId)?.username || `<@${userId}>`);
        ctx.fillText(title, width / 2, 36);

        // Draw grid starting below title
        const startY = 60;
        const totalWidth = cols * boxW + (cols - 1) * padding;
        let x0 = (width - totalWidth) / 2;

        ctx.textAlign = 'left';
        ctx.font = 'bold 14px Arial';

        for (let i = 0; i < n; i++) {
            const r = rels[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = x0 + col * (boxW + padding);
            const y = startY + row * (boxH + padding);

            // box background color based on relation
            const color = FamilyTreeGenerator.getColor(r.relationType);
            ctx.fillStyle = color;
            // rounded rect
            FamilyTreeGenerator.roundRect(ctx, x, y, boxW, boxH, 8, true, false);

            // text: username (truncate)
            const name = display[r.relatedUserId] || `<@${r.relatedUserId}>`;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            const nameX = x + 12;
            const nameY = y + 22;
            ctx.fillText(FamilyTreeGenerator.truncate(name, 28), nameX, nameY);

            // relation label under name
            ctx.font = '14px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            const gender = genders[r.relatedUserId] || null;
            const relLabel = FamilyTreeGenerator.humanizeRelation(r.relationType, gender);
            ctx.fillText(relLabel, nameX, nameY + 22);
        }

        // Show +N more if truncated
        if (moreCount > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`+${moreCount} more relations not shown`, width / 2, height - 12);
        }

        return canvas.toBuffer();
    }

    static truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.slice(0, len - 1) + '\u2026' : str;
    }

    static roundRect(ctx, x, y, w, h, r, fill, stroke) {
        if (typeof r === 'undefined') r = 5;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    static humanizeRelation(type, gender) {
        if (!type) return 'Relative';
        switch (type) {
            case 'parent':
                if (gender === 'male') return 'Father';
                if (gender === 'female') return 'Mother';
                return 'Parent';
            case 'child':
                if (gender === 'male') return 'Son';
                if (gender === 'female') return 'Daughter';
                return 'Child';
            case 'sibling': return 'Sibling';
            case 'spouse':
                if (gender === 'male') return 'Husband';
                if (gender === 'female') return 'Wife';
                return 'Spouse';
            case 'cousin': return 'Cousin';
            case 'grandparent':
                if (gender === 'male') return 'Grandfather';
                if (gender === 'female') return 'Grandmother';
                return 'Grandparent';
            case 'grandchild':
                if (gender === 'male') return 'Grandson';
                if (gender === 'female') return 'Granddaughter';
                return 'Grandchild';
            case 'uncle':
                if (gender === 'male') return 'Uncle';
                if (gender === 'female') return 'Aunt';
                return 'Uncle/Aunt';
            case 'nephew':
                if (gender === 'male') return 'Nephew';
                if (gender === 'female') return 'Niece';
                return 'Nephew/Niece';
            default: return type[0].toUpperCase() + type.slice(1);
        }
    }

    static getColor(type) {
        switch(type) {
            case 'parent': return '#e67e22';
            case 'child': return '#2ecc71';
            case 'sibling': return '#9b59b6';
            case 'spouse': return '#ff69b4';
            case 'cousin': return '#f1c40f';
            case 'grandparent': return '#f39c12';
            case 'grandchild': return '#f39c12';
            case 'uncle': return '#8e44ad';
            case 'nephew': return '#2980b9';
            default: return '#95a5a6';
        }
    }
}

module.exports = FamilyTreeGenerator;