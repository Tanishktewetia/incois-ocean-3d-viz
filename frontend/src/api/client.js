const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export async function getHealth() {
  const response = await fetch(apiUrl("/health"));

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json();
}

export async function getBathymetry({ signal } = {}) {
  const response = await fetch(apiUrl("/api/bathymetry"), { signal });
  if (!response.ok) throw new Error("GEBCO bathymetry is unavailable.");
  return response.json();
}

async function responseError(response, fallback) {
  try {
    const payload = await response.json();
    return new Error(payload.detail || fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function uploadOceanDataset(file, datasetType = "thetao", { signal } = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dataset_type", datasetType);
  const response = await fetch(apiUrl("/api/upload"), {
    method: "POST",
    body: formData,
    signal,
  });
  if (!response.ok) {
    throw await responseError(response, `Dataset upload failed with status ${response.status}`);
  }
  return response.json();
}

export async function uploadInstrumentDataset(file, { signal } = {}) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(apiUrl("/api/instruments/upload"), { method: "POST", body: formData, signal });
  if (!response.ok) throw await responseError(response, `Instrument upload failed with status ${response.status}`);
  return response.json();
}

export async function getCyclones({ signal } = {}) {
  const response = await fetch(apiUrl("/api/hazards/cyclones"), { signal });
  if (!response.ok) throw await responseError(response, "GDACS cyclone data is unavailable.");
  return response.json();
}

export async function getOceanSlice({
  depth = 0,
  variable = "thetao",
  source = "demo",
  signal,
} = {}) {
  const parameters = new URLSearchParams({
    depth: String(depth),
    variable,
    source,
  });
  const response = await fetch(apiUrl(`/api/slice?${parameters}`), { signal });

  if (!response.ok) {
    throw new Error(`Ocean slice request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getOceanLayers({
  variable = "thetao",
  time,
  source = "demo",
  signal,
} = {}) {
  const parameters = new URLSearchParams({ variable, source });
  if (time) {
    parameters.set("time", time);
  }
  const response = await fetch(apiUrl(`/api/layers?${parameters}`), { signal });

  if (!response.ok) {
    throw new Error(`Ocean layers request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getOceanCurrents({ time, signal } = {}) {
  const parameters = new URLSearchParams();
  if (time) {
    parameters.set("time", time);
  }
  const response = await fetch(apiUrl(`/api/currents?${parameters}`), { signal });
  if (!response.ok) {
    throw new Error(`Ocean currents request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getArgoProfiles({ signal } = {}) {
  const response = await fetch(apiUrl("/api/argo"), { signal });
  if (!response.ok) {
    throw new Error(`Argo profiles request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getArgoProfile(profileId, { signal } = {}) {
  const response = await fetch(apiUrl(`/api/argo/${encodeURIComponent(profileId)}/profile`), {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Argo profile request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getInstruments({ signal } = {}) {
  const response = await fetch(apiUrl("/api/instruments"), { signal });
  if (!response.ok) {
    throw new Error(`Instrument catalog request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getInstrumentProfile(instrumentId, { signal } = {}) {
  const response = await fetch(
    apiUrl(`/api/instruments/${encodeURIComponent(instrumentId)}/profile`),
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Instrument profile request failed with status ${response.status}`);
  }
  return response.json();
}
