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

export async function lookupAddress(street, city, zip) {
  const params = new URLSearchParams({ street });
  if (city) params.set("city", city);
  if (zip) params.set("zip", zip);
  return fetchJSON(`${BASE}/address?${params}`);
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

export async function extractFromUrl(url, villageName) {
  const res = await fetch(`${BASE}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, villageName }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Extraction failed: ${res.status}`);
  }
  return res.json();
}

export async function extractFromPdf(file, villageName) {
  const formData = new FormData();
  formData.append("pdf", file);
  if (villageName) formData.append("villageName", villageName);

  const res = await fetch(`${BASE}/extract/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `PDF extraction failed: ${res.status}`);
  }
  return res.json();
}

export async function saveExtracted(extracted, sourceUrl) {
  const res = await fetch(`${BASE}/extract/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted, sourceUrl }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Save failed: ${res.status}`);
  }
  return res.json();
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
