export async function getHealth() {
  const response = await fetch("/health");

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json();
}

export async function getOceanSlice({ depth = 0, variable = "thetao", signal } = {}) {
  const parameters = new URLSearchParams({
    depth: String(depth),
    variable,
  });
  const response = await fetch(`/api/slice?${parameters}`, { signal });

  if (!response.ok) {
    throw new Error(`Ocean slice request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getOceanLayers({ variable = "thetao", time, signal } = {}) {
  const parameters = new URLSearchParams({ variable });
  if (time) {
    parameters.set("time", time);
  }
  const response = await fetch(`/api/layers?${parameters}`, { signal });

  if (!response.ok) {
    throw new Error(`Ocean layers request failed with status ${response.status}`);
  }

  return response.json();
}