const fs = require('fs');
const path = require('path');
const REL_PATH = path.join(__dirname, '..', '..', 'relationships.json');

function isDescendant(data, ancestorId, descendantId, maxDepth = 6) {
    if (ancestorId === descendantId) return false;
    const q = [{id: ancestorId, depth:0}];
    const seen = new Set();
    while (q.length) {
        const {id, depth} = q.shift();
        if (depth >= maxDepth) continue;
        seen.add(id);
        const node = data[id];
        if (!node || !Array.isArray(node.children)) continue;
        for (const c of node.children) {
            if (c === descendantId) return true;
            if (!seen.has(c)) q.push({id:c, depth:depth+1});
        }
    }
    return false;
}

const raw = fs.readFileSync(REL_PATH,'utf8');
const data = JSON.parse(raw);

const anomalies = [];
for (const [id, obj] of Object.entries(data)) {
    if (!obj) continue;
    if (obj.partner) {
        const p = obj.partner;
        if (isDescendant(data, id, p) || isDescendant(data, p, id)) {
            anomalies.push({user:id, type:'partner-ancestor/descendant', partner:p});
        }
    }
    if (Array.isArray(obj.history)) {
        for (const h of obj.history) {
            const pid = h.partnerId || h.partner;
            if (!pid) continue;
            if (isDescendant(data, id, pid) || isDescendant(data, pid, id)) {
                anomalies.push({user:id, type:'history-ancestor/descendant', partner:pid, entry:h});
            }
        }
    }
}

console.log('Anomalies found:', anomalies.length);
if (anomalies.length>0) console.log(JSON.stringify(anomalies, null, 2));
else console.log('No ancestor/descendant partner anomalies found.');
