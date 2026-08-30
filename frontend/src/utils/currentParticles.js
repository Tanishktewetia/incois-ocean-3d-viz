import * as THREE from "three";

export const CURRENT_PARTICLE_COUNT = 320;
const MAX_PARTICLE_AGE = 7;
const ADVECTION_SCALE = 0.7;

function finiteVector(field, row, column) {
  const eastward = field.eastward[row]?.[column];
  const northward = field.northward[row]?.[column];
  return Number.isFinite(eastward) && Number.isFinite(northward)
    ? [eastward, northward]
    : null;
}

export function sampleCurrent(field, longitude, latitude) {
  const longitudes = field.longitudes;
  const latitudes = field.latitudes;
  if (
    longitude < longitudes[0]
    || longitude > longitudes.at(-1)
    || latitude < latitudes[0]
    || latitude > latitudes.at(-1)
  ) {
    return null;
  }

  const column = Math.min(
    Math.floor((longitude - longitudes[0]) / (longitudes[1] - longitudes[0])),
    longitudes.length - 2,
  );
  const row = Math.min(
    Math.floor((latitude - latitudes[0]) / (latitudes[1] - latitudes[0])),
    latitudes.length - 2,
  );
  const x = (longitude - longitudes[column]) / (longitudes[column + 1] - longitudes[column]);
  const y = (latitude - latitudes[row]) / (latitudes[row + 1] - latitudes[row]);
  const corners = [
    [row, column, (1 - x) * (1 - y)],
    [row, column + 1, x * (1 - y)],
    [row + 1, column, (1 - x) * y],
    [row + 1, column + 1, x * y],
  ];

  let eastward = 0;
  let northward = 0;
  let totalWeight = 0;
  corners.forEach(([cornerRow, cornerColumn, weight]) => {
    const vector = finiteVector(field, cornerRow, cornerColumn);
    if (vector) {
      eastward += vector[0] * weight;
      northward += vector[1] * weight;
      totalWeight += weight;
    }
  });
  return totalWeight > 0 ? [eastward / totalWeight, northward / totalWeight] : null;
}

export function createCurrentParticles({ planeWidth, planeHeight, surfaceZ, particleCount = CURRENT_PARTICLE_COUNT }) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const material = new THREE.PointsMaterial({
    color: 0xe8fbff,
    size: 0.09,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 20;
  points.visible = false;

  const particles = Array.from({ length: particleCount }, () => ({
    longitude: 0,
    latitude: 0,
    age: 0,
  }));
  let field = null;
  let lastTime = performance.now();

  function respawn(particle) {
    if (!field) return;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const longitude = THREE.MathUtils.lerp(field.longitudes[0], field.longitudes.at(-1), Math.random());
      const latitude = THREE.MathUtils.lerp(field.latitudes[0], field.latitudes.at(-1), Math.random());
      if (sampleCurrent(field, longitude, latitude)) {
        particle.longitude = longitude;
        particle.latitude = latitude;
        particle.age = Math.random() * MAX_PARTICLE_AGE;
        return;
      }
    }
    particle.age = MAX_PARTICLE_AGE;
  }

  function writePosition(particle, index) {
    const longitudeFraction = (particle.longitude - field.longitudes[0])
      / (field.longitudes.at(-1) - field.longitudes[0]);
    const latitudeFraction = (particle.latitude - field.latitudes[0])
      / (field.latitudes.at(-1) - field.latitudes[0]);
    positions[index * 3] = (longitudeFraction - 0.5) * planeWidth;
    positions[index * 3 + 1] = (latitudeFraction - 0.5) * planeHeight;
    positions[index * 3 + 2] = surfaceZ + 0.06;
  }

  return {
    points,
    setField(nextField) {
      field = nextField;
      particles.forEach((particle, index) => {
        respawn(particle);
        writePosition(particle, index);
      });
      geometry.attributes.position.needsUpdate = true;
    },
    update(now = performance.now()) {
      const elapsed = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      if (!field || !points.visible) return;
      particles.forEach((particle, index) => {
        const vector = sampleCurrent(field, particle.longitude, particle.latitude);
        if (!vector || particle.age >= MAX_PARTICLE_AGE) {
          respawn(particle);
        } else {
          particle.longitude += vector[0] * ADVECTION_SCALE * elapsed;
          particle.latitude += vector[1] * ADVECTION_SCALE * elapsed;
          particle.age += elapsed;
          if (!sampleCurrent(field, particle.longitude, particle.latitude)) respawn(particle);
        }
        writePosition(particle, index);
      });
      geometry.attributes.position.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}