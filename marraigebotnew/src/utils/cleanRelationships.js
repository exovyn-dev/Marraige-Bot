const fs = require('fs');
const path = require('path');

const REL_PATH = path.join(__dirname, '..', '..', 'relationships.json');
const BACKUP_PATH = REL_PATH + '.bak.' + Date.now();

function unique(arr) {
    return Array.from(new Set(arr));
}

function normalizeHistoryEntry(e) {
    // Normalize partner -> partnerId, unify endedAt/to
    const out = {};
    if (e.partnerId) out.partnerId = e.partnerId;
    else if (e.partner) out.partnerId = e.partner;
    if (e.status) out.status = e.status;
    if (e.from) out.from = e.from;
    if (e.to) out.to = e.to;
    if (e.endedAt) out.endedAt = e.endedAt;
    // if to exists but endedAt missing, copy to -> endedAt for consistency
    if (out.to && !out.endedAt) out.endedAt = out.to;
    return out;
}

function isDescendant(relationships, ancestorId, descendantId, maxDepth = 5) {
    // Breadth-first search through children links up to maxDepth
    if (ancestorId === descendantId) return false; // not considered descendant
    const queue = [{id: ancestorId, depth:0}];
    const visited = new Set();
    while (queue.length) {
        const {id, depth} = queue.shift();
        if (depth >= maxDepth) continue;
        visited.add(id);
        const node = relationships[id];
        if (!node || !Array.isArray(node.children)) continue;
        for (const child of node.children) {
            if (child === descendantId) return true;
            if (!visited.has(child)) queue.push({id: child, depth: depth+1});
        }
    }
    return false;
}

function dedupeHistory(arr) {
    const seen = new Set();
    const out = [];
    for (const raw of arr) {
        const e = normalizeHistoryEntry(raw);
        const key = `${e.partnerId||''}|${e.status||''}|${e.from||''}|${e.endedAt||''}`;
        if (!seen.has(key)) {
            seen.add(key);
            out.push(e);
        }
    }
    return out;
}

function summarizeChanges(changes) {
    const lines = [];
    lines.push(`Removed self-child entries: ${changes.selfChildRemoved}`);
    lines.push(`Removed duplicate child ids: ${changes.dupChildrenRemoved}`);
    lines.push(`Cleared invalid partners (self): ${changes.invalidPartnersCleared}`);
    lines.push(`Cleared partners who were descendants: ${changes.descendantPartnersCleared}`);
    lines.push(`Normalized history entries deduped: ${changes.historyDeduped}`);
    return lines.join('\n');
}

async function main() {
    if (!fs.existsSync(REL_PATH)) {
        console.error('relationships.json not found at', REL_PATH);
        process.exit(1);
    }

    const raw = fs.readFileSync(REL_PATH, 'utf8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        console.error('JSON parse error:', err.message);
        process.exit(1);
    }

    // Backup
    fs.writeFileSync(BACKUP_PATH, raw, 'utf8');
    console.log('Backup written to', BACKUP_PATH);

    const changes = {
        selfChildRemoved: 0,
        dupChildrenRemoved: 0,
        invalidPartnersCleared: 0,
        descendantPartnersCleared: 0,
        historyDeduped: 0,
        historyAnomaliesRemoved: 0
    };

    // First pass: remove duplicate children and self references
    for (const [id, obj] of Object.entries(data)) {
        if (!obj) continue;
        if (!Array.isArray(obj.children)) obj.children = [];
        // remove self
        const beforeLen = obj.children.length;
        obj.children = obj.children.filter(c => c !== id);
        changes.selfChildRemoved += (beforeLen - obj.children.length);
        // dedupe
        const deduped = unique(obj.children);
        changes.dupChildrenRemoved += (obj.children.length - deduped.length);
        obj.children = deduped;
    }

    // Second pass: normalize history arrays and dedupe
    for (const [id, obj] of Object.entries(data)) {
        if (!obj) continue;
        if (!Array.isArray(obj.history)) obj.history = [];
        const before = obj.history.length;
        obj.history = dedupeHistory(obj.history);
        changes.historyDeduped += (before - obj.history.length);
        // remove history entries where partner is ancestor/descendant
        const filtered = [];
        for (const h of obj.history) {
            const pid = h.partnerId;
            if (!pid) { filtered.push(h); continue; }
            if (isDescendant(data, id, pid, 6) || isDescendant(data, pid, id, 6)) {
                changes.historyAnomaliesRemoved += 1;
                // skip (remove) this history entry
            } else {
                filtered.push(h);
            }
        }
        obj.history = filtered;
    }

    // Third pass: clear invalid partners and partners that are descendants
    for (const [id, obj] of Object.entries(data)) {
        if (!obj) continue;
        // If partner equals self, clear
        if (obj.partner && obj.partner === id) {
            obj.partner = null;
            obj.status = null;
            obj.since = null;
            changes.invalidPartnersCleared += 1;
        }
        // If partner is one of this user's descendants or ancestors (child/grandchild or parent/grandparent), clear to avoid close-relative relationships
        if (obj.partner) {
            const partnerId = obj.partner;
            if (isDescendant(data, id, partnerId, 5)) {
                console.log(`Clearing partner ${partnerId} for ${id} (partner was a descendant)`);
                obj.partner = null;
                obj.status = null;
                obj.since = null;
                changes.descendantPartnersCleared += 1;
            } else if (isDescendant(data, partnerId, id, 5)) {
                console.log(`Clearing partner ${partnerId} for ${id} (partner was an ancestor)`);
                obj.partner = null;
                obj.status = null;
                obj.since = null;
                changes.descendantPartnersCleared += 1;
            }
        }
    }

    // Fourth pass: ensure consistent status when partner exists
    for (const [id, obj] of Object.entries(data)) {
        if (!obj) continue;
        if (obj.partner && !obj.status) {
            // If since present assume married, otherwise dating
            obj.status = obj.since ? 'married' : 'dating';
        }
    }

    // Write cleaned file
    const cleaned = JSON.stringify(data, null, 2);
    fs.writeFileSync(REL_PATH, cleaned, 'utf8');

    console.log('Clean completed. Summary:');
    console.log(summarizeChanges(changes));
    console.log('Original backed up at', BACKUP_PATH);
}

main().catch(err => {
    console.error('Error during clean:', err);
    process.exit(1);
});
