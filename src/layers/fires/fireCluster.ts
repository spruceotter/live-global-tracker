/**
 * Spatial clustering for FIRMS fire hotspots.
 *
 * Individual hotspot pixels look like acne on a globe; clustering collapses
 * them into readable "fire complexes" while keeping the underlying features
 * available for detail-on-click. Uses a simple grid-based nearest-neighbor
 * sweep — O(n) on the typical 15K-hotspot daily feed.
 *
 * TODO(S4.4): enrich named clusters from InciWeb (US) / EFFIS (EU) to show
 * "Donnie Creek Fire, 580K ha, 9 days" instead of a generic region label.
 */

import type { NormalizedFeature } from '../../core/types';

/** Cluster radius in degrees. ~50km at equator; tighter at poles. */
const CLUSTER_EPS_DEG = 0.45;
/** Minimum hotspots to form a named cluster. */
const MIN_HOTSPOTS = 3;

export interface FireCluster {
  id: string;
  centroidLat: number;
  centroidLon: number;
  hotspotCount: number;
  totalFrp: number;
  peakFrp: number;
  memberIds: string[];
}

/**
 * Group hotspots by proximity. Returns an array of clusters and a set of
 * singletons that didn't meet the min-hotspots threshold.
 */
export function clusterHotspots(hotspots: NormalizedFeature[]): {
  clusters: FireCluster[];
  singletonIds: Set<string>;
} {
  // Grid bucket by floored lat/lon. Two hotspots that share a bucket or a
  // neighbor bucket are candidates for the same cluster.
  const buckets = new Map<string, NormalizedFeature[]>();
  const key = (lat: number, lon: number) =>
    `${Math.floor(lat / CLUSTER_EPS_DEG)}_${Math.floor(lon / CLUSTER_EPS_DEG)}`;

  for (const h of hotspots) {
    const k = key(h.lat, h.lon);
    const arr = buckets.get(k);
    if (arr) arr.push(h);
    else buckets.set(k, [h]);
  }

  // DBSCAN-ish: visit each hotspot, expand via 3x3 neighbor buckets
  const visited = new Set<string>();
  const clusters: FireCluster[] = [];
  const singletonIds = new Set<string>();

  for (const seed of hotspots) {
    if (visited.has(seed.id)) continue;
    const queue = [seed];
    const members: NormalizedFeature[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      members.push(current);
      // Visit all neighbors within 3x3 buckets
      const [baseLat, baseLon] = key(current.lat, current.lon).split('_').map(Number);
      for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLon = -1; dLon <= 1; dLon++) {
          const bucket = buckets.get(`${baseLat + dLat}_${baseLon + dLon}`);
          if (!bucket) continue;
          for (const candidate of bucket) {
            if (visited.has(candidate.id)) continue;
            const dy = candidate.lat - current.lat;
            const dx = candidate.lon - current.lon;
            if (dy * dy + dx * dx <= CLUSTER_EPS_DEG * CLUSTER_EPS_DEG) {
              queue.push(candidate);
            }
          }
        }
      }
    }
    if (members.length >= MIN_HOTSPOTS) {
      clusters.push(buildCluster(members));
    } else {
      for (const m of members) singletonIds.add(m.id);
    }
  }

  // Sort clusters descending by total FRP so the most intense ones rank first
  clusters.sort((a, b) => b.totalFrp - a.totalFrp);
  return { clusters, singletonIds };
}

function buildCluster(members: NormalizedFeature[]): FireCluster {
  let sumLat = 0;
  let sumLon = 0;
  let totalFrp = 0;
  let peakFrp = 0;
  const ids: string[] = [];
  for (const m of members) {
    sumLat += m.lat;
    sumLon += m.lon;
    const frp = (m.properties.frp as number) ?? 0;
    totalFrp += frp;
    if (frp > peakFrp) peakFrp = frp;
    ids.push(m.id);
  }
  return {
    id: `cluster_${members[0].lat.toFixed(2)}_${members[0].lon.toFixed(2)}_${members.length}`,
    centroidLat: sumLat / members.length,
    centroidLon: sumLon / members.length,
    hotspotCount: members.length,
    totalFrp,
    peakFrp,
    memberIds: ids,
  };
}

/** Rough location label for an unnamed cluster. Ideally superseded by InciWeb/EFFIS in a follow-up. */
export function describeClusterLocation(cluster: FireCluster): string {
  const latHemi = cluster.centroidLat >= 0 ? 'N' : 'S';
  const lonHemi = cluster.centroidLon >= 0 ? 'E' : 'W';
  return `Fire complex near ${Math.abs(cluster.centroidLat).toFixed(1)}°${latHemi}, ${Math.abs(cluster.centroidLon).toFixed(1)}°${lonHemi}`;
}
