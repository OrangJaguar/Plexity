export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function lineIntersection(p1, p2, p3, p4) {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

export function perpendicularFoot(point, lineA, lineB) {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return lineA;
  const t = ((point.x - lineA.x) * dx + (point.y - lineA.y) * dy) / len2;
  return { x: lineA.x + t * dx, y: lineA.y + t * dy };
}

export function parallelThrough(point, lineA, lineB) {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  return { a: point, b: { x: point.x + dx, y: point.y + dy } };
}

export function perpendicularThrough(point, lineA, lineB) {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  return { a: point, b: { x: point.x - dy, y: point.y + dx } };
}

export function circleFromCenterRadius(center, radius) {
  return { center, radius };
}

export function updateDependentObjects(objects) {
  const byId = new Map(objects.map((o) => [o.id, o]));
  return objects.map((obj) => {
    if (obj.type === 'midpoint' && obj.parents?.length === 2) {
      const a = byId.get(obj.parents[0]);
      const b = byId.get(obj.parents[1]);
      if (a?.point && b?.point) return { ...obj, point: midpoint(a.point, b.point) };
    }
    if (obj.type === 'intersection' && obj.parents?.length === 2) {
      const l1 = byId.get(obj.parents[0]);
      const l2 = byId.get(obj.parents[1]);
      if (l1?.a && l1?.b && l2?.a && l2?.b) {
        const pt = lineIntersection(l1.a, l1.b, l2.a, l2.b);
        if (pt) return { ...obj, point: pt };
      }
    }
    return obj;
  });
}

export function angleAt(a, vertex, b) {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 < 1e-12 || m2 < 1e-12) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * (180 / Math.PI);
}

export function reflectPoint(point, lineA, lineB) {
  const foot = perpendicularFoot(point, lineA, lineB);
  return { x: 2 * foot.x - point.x, y: 2 * foot.y - point.y };
}

export function rotatePoint(point, center, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

export function translatePoint(point, dx, dy) {
  return { x: point.x + dx, y: point.y + dy };
}
