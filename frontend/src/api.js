// api.js — API client for RoadSense backend

const BASE = "/api";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function getVillage(name) {
  return fetchJSON(`${BASE}/village/${encodeURIComponent(name)}`);
}

export async function compareVillages(names) {
  const param = names.map(encodeURIComponent).join(",");
  return fetchJSON(`${BASE}/compare?villages=${param}`);
}

export async function getPeers(population, county) {
  let url = `${BASE}/peers?population=${population}`;
  if (county) url += `&county=${encodeURIComponent(county)}`;
  return fetchJSON(url);
}

export async function searchVillages(query) {
  return fetchJSON(`${BASE}/search?q=${encodeURIComponent(query)}`);
}

export async function getBenchmarks() {
  return fetchJSON(`${BASE}/benchmarks`);
}

export async function analyzeVillage(villageName) {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ villageName }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Analysis failed: ${res.status}`);
  }
  return res.json();
}
