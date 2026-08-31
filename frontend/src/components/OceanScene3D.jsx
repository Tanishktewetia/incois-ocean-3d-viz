import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getBathymetry, getCyclones, getOceanCurrents, getOceanLayers } from "../api/client.js";
import InstrumentOverlay from "./InstrumentOverlay.jsx";
import DepthTimeSlider from "./DepthTimeSlider.jsx";
import VisualizationControls from "./VisualizationControls.jsx";
import { ControlInfoModal, InfoButton } from "./ControlInfoModal.jsx";
import { createSmoothColorBuffer, getFiniteRange, interpolateColor } from "../utils/colorScale.js";
import {
  createCurrentParticles,
  CURRENT_PARTICLE_COUNT,
} from "../utils/currentParticles.js";
import { createIsosurface } from "../utils/isosurface.js";
import { getGibsLandImage } from "../utils/gibsImagery.js";

const PLANE_WIDTH = 12;
const STACK_HEIGHT = 5;
const VARIABLE_LABELS = {
  thetao: "Temperature",
  so: "Salinity",
  current_magnitude: "Current magnitude",
};
const FIGURE_LABELS = {
  volume: "Layered ocean volume",
  relief: "Field relief surface",
};

function displayUnit(payload) {
  if (payload?.variable === "so") return "PSU";
  if (payload?.variable === "current_magnitude") return "m/s";
  if (payload?.variable === "thetao") return "°C";
  return payload?.unit || "";
}

function createOceanScene(
  container,
  payload,
  range,
  scale,
  opacity,
  verticalExaggeration,
  isosurfaceEnabled,
  isosurfaceThreshold,
  isothermContoursEnabled,
  backgroundColor,
  onInstrumentSelect,
  onInstrumentHover,
  onDataHover,
  presentation,
  reducedMotion,
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  scene.add(new THREE.HemisphereLight(0xcceeff, 0x13202a, 2.1));
  const isosurfaceLight = new THREE.DirectionalLight(0xffffff, 2.2);
  isosurfaceLight.position.set(6, -8, 10);
  scene.add(isosurfaceLight);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(10, -13, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.autoRotate = presentation && !reducedMotion;
  controls.autoRotateSpeed = 0.35;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  const preventMiddleMouseDefault = (event) => {
    if (event.button === 1) event.preventDefault();
  };
  renderer.domElement.addEventListener("pointerdown", preventMiddleMouseDefault, { passive: false });
  renderer.domElement.addEventListener("mousedown", preventMiddleMouseDefault, { passive: false });
  renderer.domElement.addEventListener("auxclick", preventMiddleMouseDefault);
  const initialCameraPosition = camera.position.clone();
  const initialTarget = controls.target.clone();

  const longitudeSpan = payload.longitudes.at(-1) - payload.longitudes[0];
  const latitudeSpan = payload.latitudes.at(-1) - payload.latitudes[0];
  const planeHeight = PLANE_WIDTH * (latitudeSpan / longitudeSpan);
  const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, planeHeight);
  const maximumDepth = Math.max(...payload.layers.map((layer) => layer.depth));
  const textures = [];
  const materials = [];
  const planes = [];
  let landImageData = null;
  const currentParticles = createCurrentParticles({
    planeWidth: PLANE_WIDTH,
    planeHeight,
    surfaceZ: STACK_HEIGHT / 2,
    particleCount: presentation ? 96 : CURRENT_PARTICLE_COUNT,
  });
  scene.add(currentParticles.points);
  const isosurface = createIsosurface(payload, range, PLANE_WIDTH, planeHeight, STACK_HEIGHT);
  scene.add(isosurface.mesh);
  isosurface.setThreshold(isosurfaceThreshold);
  isosurface.setVisible(isosurfaceEnabled);
  const instrumentMarkers = new THREE.Group();
  const hazardMarkers = new THREE.Group();
  scene.add(hazardMarkers);
  const markerGeometries = {
    core_argo: new THREE.SphereGeometry(0.1, 16, 12),
    bgc_argo: new THREE.OctahedronGeometry(0.14),
    glider: new THREE.ConeGeometry(0.14, 0.28, 3),
    ctd: new THREE.BoxGeometry(0.2, 0.2, 0.2),
  };
  const markerMaterials = {
    core_argo: new THREE.MeshBasicMaterial({ color: 0xffa629 }),
    bgc_argo: new THREE.MeshBasicMaterial({ color: 0x56d98b }),
    glider: new THREE.MeshBasicMaterial({ color: 0xd47cff }),
    ctd: new THREE.MeshBasicMaterial({ color: 0xd47cff }),
  };
  const markerHitGeometry = new THREE.SphereGeometry(0.28, 8, 6);
  const markerHitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const selectedMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  scene.add(instrumentMarkers);

  function createLayerPixels(layer, nextRange, nextScale) {
    const result = createSmoothColorBuffer(
      layer.values,
      nextRange.minimum,
      nextRange.maximum,
      { scale: nextScale },
    );
    if (!landImageData) return result;
    for (let row = 0; row < result.height; row += 1) {
      for (let column = 0; column < result.width; column += 1) {
        const pixelIndex = (row * result.width + column) * 4;
        if (result.pixels[pixelIndex + 3] !== 0) continue;
        const imageColumn = Math.round((column / Math.max(1, result.width - 1)) * (landImageData.width - 1));
        const imageRow = Math.round((1 - row / Math.max(1, result.height - 1)) * (landImageData.height - 1));
        const imageIndex = (imageRow * landImageData.width + imageColumn) * 4;
        result.pixels[pixelIndex] = landImageData.data[imageIndex];
        result.pixels[pixelIndex + 1] = landImageData.data[imageIndex + 1];
        result.pixels[pixelIndex + 2] = landImageData.data[imageIndex + 2];
        result.pixels[pixelIndex + 3] = 255;
      }
    }
    return result;
  }

  payload.layers.forEach((layer) => {
    const textureData = createLayerPixels(layer, range, scale);
    const texture = new THREE.DataTexture(
      textureData.pixels,
      textureData.width,
      textureData.height,
      THREE.RGBAFormat,
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    textures.push(texture);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      opacity,
      side: THREE.DoubleSide,
      transparent: true,
    });
    materials.push(material);

    const plane = new THREE.Mesh(geometry, material);
    plane.position.z = STACK_HEIGHT / 2 - (layer.depth / maximumDepth) * STACK_HEIGHT;
    plane.renderOrder = payload.layers.length - payload.layers.indexOf(layer);
    scene.add(plane);
    planes.push(plane);
  });

  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.BoxGeometry(PLANE_WIDTH, planeHeight, STACK_HEIGHT),
    ),
    new THREE.LineBasicMaterial({ color: 0x7da6bd, transparent: true, opacity: 0.45 }),
  );
  scene.add(frame);
  let bathymetryMesh = null;
  let reliefMesh = null;
  let sceneViewMode = "composite";
  let sceneFigureMode = "volume";
  let sceneIsosurfaceEnabled = isosurfaceEnabled;
  let sceneIsothermContoursEnabled = isothermContoursEnabled;
  let sceneParticlesEnabled = false;
  let selectedDepthIndex = 0;
  let layerOpacity = opacity;
  let scenePayload = payload;
  let sceneRange = range;
  let sceneScale = scale;
  let sceneVerticalExaggeration = verticalExaggeration;

  function disposeFigureMesh(mesh) {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  function fieldColor(value) {
    const [red, green, blue] = interpolateColor(value, sceneRange.minimum, sceneRange.maximum, sceneScale);
    return [red / 255, green / 255, blue / 255];
  }

  const volumeContourGroup = new THREE.Group();
  const reliefContourGroup = new THREE.Group();
  scene.add(volumeContourGroup, reliefContourGroup);

  function clearContourGroup(group) {
    group.children.forEach((object) => {
      object.geometry.dispose();
      object.material.dispose();
    });
    group.clear();
  }

  function contourLineForLayer(layer, zForValue) {
    const rows = layer.values.length;
    const columns = layer.values[0]?.length || 0;
    const values = layer.values.flat().filter(Number.isFinite);
    if (!values.length || columns < 2 || rows < 2) return null;
    const minimum = Math.ceil(Math.min(...values) / 2) * 2;
    const maximum = Math.floor(Math.max(...values) / 2) * 2;
    const positions = [];
    const stride = 3;
    const point = (row, column, value) => ({
      x: (column / (columns - 1) - 0.5) * PLANE_WIDTH,
      y: (row / (rows - 1) - 0.5) * planeHeight,
      z: zForValue(value),
    });
    for (let level = minimum; level <= maximum; level += 2) {
      for (let row = 0; row < rows - 1; row += stride) {
        for (let column = 0; column < columns - 1; column += stride) {
          const nextRow = Math.min(rows - 1, row + stride);
          const nextColumn = Math.min(columns - 1, column + stride);
          const corners = [
            [point(row, column, layer.values[row][column]), layer.values[row][column]],
            [point(row, nextColumn, layer.values[row][nextColumn]), layer.values[row][nextColumn]],
            [point(nextRow, nextColumn, layer.values[nextRow][nextColumn]), layer.values[nextRow][nextColumn]],
            [point(nextRow, column, layer.values[nextRow][column]), layer.values[nextRow][column]],
          ];
          if (!corners.every((corner) => Number.isFinite(corner[1]))) continue;
          const intersections = [];
          for (let edge = 0; edge < corners.length; edge += 1) {
            const [firstPoint, firstValue] = corners[edge];
            const [secondPoint, secondValue] = corners[(edge + 1) % corners.length];
            if ((firstValue < level && secondValue >= level) || (secondValue < level && firstValue >= level)) {
              const fraction = (level - firstValue) / (secondValue - firstValue);
              intersections.push({
                x: firstPoint.x + (secondPoint.x - firstPoint.x) * fraction,
                y: firstPoint.y + (secondPoint.y - firstPoint.y) * fraction,
                z: zForValue(level),
              });
            }
          }
          if (intersections.length === 2) {
            positions.push(intersections[0].x, intersections[0].y, intersections[0].z, intersections[1].x, intersections[1].y, intersections[1].z);
          }
        }
      }
    }
    if (!positions.length) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.76 }));
  }

  function rebuildIsothermContours() {
    clearContourGroup(volumeContourGroup);
    clearContourGroup(reliefContourGroup);
    if (scenePayload.variable !== "thetao") return;
    scenePayload.layers.forEach((layer) => {
      const line = contourLineForLayer(layer, () => 0);
      if (line) {
        line.position.z = STACK_HEIGHT / 2 - (layer.depth / maximumDepth) * STACK_HEIGHT * sceneVerticalExaggeration;
        volumeContourGroup.add(line);
      }
    });
    const reliefLayer = scenePayload.layers[selectedDepthIndex];
    const span = Math.max(Number.EPSILON, sceneRange.maximum - sceneRange.minimum);
    const reliefLine = contourLineForLayer(reliefLayer, (value) => ((value - sceneRange.minimum) / span - 0.5) * 2.4 + 0.012);
    if (reliefLine) reliefContourGroup.add(reliefLine);
    applyViewMode();
  }

  function rebuildReliefFigure() {
    disposeFigureMesh(reliefMesh);
    const layer = scenePayload.layers[selectedDepthIndex];
    const rows = scenePayload.latitudes.length;
    const columns = scenePayload.longitudes.length;
    const vertices = [];
    const colors = [];
    const span = Math.max(Number.EPSILON, sceneRange.maximum - sceneRange.minimum);
    const addVertex = (row, column) => {
        const value = layer.values[row][column];
      vertices.push(
        (column / (columns - 1) - 0.5) * PLANE_WIDTH,
        (row / (rows - 1) - 0.5) * planeHeight,
        ((value - sceneRange.minimum) / span - 0.5) * 2.4,
      );
      colors.push(...fieldColor(value));
    };
    for (let row = 0; row < rows - 1; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const corners = [
          layer.values[row][column],
          layer.values[row][column + 1],
          layer.values[row + 1][column],
          layer.values[row + 1][column + 1],
        ];
        if (!corners.every(Number.isFinite)) continue;
        addVertex(row, column); addVertex(row + 1, column); addVertex(row, column + 1);
        addVertex(row, column + 1); addVertex(row + 1, column); addVertex(row + 1, column + 1);
      }
    }
    const reliefGeometry = new THREE.BufferGeometry();
    reliefGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    reliefGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    reliefGeometry.computeVertexNormals();
    reliefMesh = new THREE.Mesh(reliefGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.72, metalness: 0 }));
    scene.add(reliefMesh);
    applyViewMode();
  }

  function positionDepthLayers(exaggeration) {
    sceneVerticalExaggeration = exaggeration;
    planes.forEach((plane, index) => {
      plane.position.z = STACK_HEIGHT / 2
        - (payload.layers[index].depth / maximumDepth) * STACK_HEIGHT * exaggeration;
    });
    volumeContourGroup.children.forEach((contour, index) => {
      contour.position.z = STACK_HEIGHT / 2 - (scenePayload.layers[index].depth / maximumDepth) * STACK_HEIGHT * exaggeration;
    });
    frame.scale.z = exaggeration;
    frame.position.z = STACK_HEIGHT / 2 - (STACK_HEIGHT * exaggeration) / 2;
    isosurface.setVerticalExaggeration(exaggeration);
  }
  function applyViewMode() {
    const volumeVisible = sceneFigureMode === "volume";
    planes.forEach((plane, index) => {
      plane.visible = volumeVisible && (sceneViewMode === "composite" || (sceneViewMode === "depth" && index === selectedDepthIndex));
    });
    if (bathymetryMesh) bathymetryMesh.visible = volumeVisible && (sceneViewMode === "composite" || sceneViewMode === "bathymetry");
    isosurface.mesh.visible = volumeVisible && (sceneViewMode === "isosurface" || (sceneViewMode === "composite" && sceneIsosurfaceEnabled));
    instrumentMarkers.visible = volumeVisible && (sceneViewMode === "composite" || sceneViewMode === "instruments");
    hazardMarkers.visible = volumeVisible && sceneViewMode === "composite";
    currentParticles.points.visible = volumeVisible && sceneViewMode === "composite" && sceneParticlesEnabled;
    frame.visible = volumeVisible && sceneViewMode === "composite";
    if (reliefMesh) reliefMesh.visible = sceneFigureMode === "relief";
    volumeContourGroup.visible = volumeVisible && sceneIsothermContoursEnabled && scenePayload.variable === "thetao";
    volumeContourGroup.children.forEach((contour, index) => {
      contour.visible = volumeContourGroup.visible && (sceneViewMode === "composite" || (sceneViewMode === "depth" && index === selectedDepthIndex));
    });
    reliefContourGroup.visible = sceneFigureMode === "relief" && sceneIsothermContoursEnabled && scenePayload.variable === "thetao";
  }
  positionDepthLayers(verticalExaggeration);
  rebuildReliefFigure();
  rebuildIsothermContours();

  function handlePointerClick(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(instrumentMarkers.children, true)[0];
    if (hit) {
      onInstrumentSelect(hit.object.userData.instrument.id);
      return;
    }
    const dataHit = raycaster.intersectObjects(planes, false).find((intersection) => intersection.object.visible && intersection.uv);
  }
  function handlePointerMove(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(instrumentMarkers.children, true)[0];
    const dataHit = !hit
      ? raycaster.intersectObjects(planes, false).find((intersection) => intersection.object.visible && intersection.uv)
      : null;
    if (dataHit) {
      const column = Math.max(0, Math.min(payload.longitudes.length - 1, Math.round(dataHit.uv.x * (payload.longitudes.length - 1))));
      const row = Math.max(0, Math.min(payload.latitudes.length - 1, Math.round(dataHit.uv.y * (payload.latitudes.length - 1))));
      const layerIndex = Math.max(0, planes.indexOf(dataHit.object));
      const value = payload.layers[layerIndex]?.values[row]?.[column];
      if (Number.isFinite(value)) {
        const [red, green, blue] = interpolateColor(value, sceneRange.minimum, sceneRange.maximum, sceneScale);
        onDataHover({
          value,
          depth: payload.layers[layerIndex].depth,
          latitude: payload.latitudes[row],
          longitude: payload.longitudes[column],
          variable: payload.variable,
          unit: displayUnit(payload),
          color: `rgb(${red}, ${green}, ${blue})`,
        });
      } else {
        onDataHover(null);
      }
    } else {
      onDataHover(null);
    }
    renderer.domElement.style.cursor = hit ? "pointer" : dataHit ? "crosshair" : "grab";
    onInstrumentHover(hit?.object.userData.instrument || null);
  }
  function handlePointerLeave() {
    onDataHover(null);
    onInstrumentHover(null);
  }
  renderer.domElement.addEventListener("click", handlePointerClick);
  renderer.domElement.addEventListener("pointermove", handlePointerMove);
  renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

  function resize() {
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 420);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  let animationFrame;
  function animate() {
    currentParticles.update();
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }
  animate();

  return {
    setBathymetry(bathymetry) {
      if (bathymetryMesh) {
        scene.remove(bathymetryMesh);
        bathymetryMesh.geometry.dispose();
        bathymetryMesh.material.dispose();
      }
      const rows = bathymetry.latitudes.length;
      const columns = bathymetry.longitudes.length;
      const sourceStride = 4;
      const meshRows = Math.ceil((rows - 1) / sourceStride) + 1;
      const meshColumns = Math.ceil((columns - 1) / sourceStride) + 1;
      const meshGeometry = new THREE.PlaneGeometry(PLANE_WIDTH, planeHeight, meshColumns - 1, meshRows - 1);
      const positions = meshGeometry.attributes.position;
      const maximumOceanDepth = Math.max(1, Math.abs(Math.min(0, bathymetry.minimum)));
      const smoothRadius = 2;
      for (let latIndex = 0; latIndex < meshRows; latIndex += 1) {
        for (let lonIndex = 0; lonIndex < meshColumns; lonIndex += 1) {
          const sourceLat = Math.min(rows - 1, latIndex * sourceStride);
          const sourceLon = Math.min(columns - 1, lonIndex * sourceStride);
          let totalDepth = 0;
          let samples = 0;
          for (let latOffset = -smoothRadius; latOffset <= smoothRadius; latOffset += 1) {
            for (let lonOffset = -smoothRadius; lonOffset <= smoothRadius; lonOffset += 1) {
              const row = bathymetry.elevations[Math.max(0, Math.min(rows - 1, sourceLat + latOffset))];
              const value = row?.[Math.max(0, Math.min(columns - 1, sourceLon + lonOffset))];
              if (value != null && Number.isFinite(value)) { totalDepth += Math.max(0, -value); samples += 1; }
            }
          }
          const depth = samples ? totalDepth / samples : 0;
          positions.setZ(latIndex * meshColumns + lonIndex, -STACK_HEIGHT / 2 - 0.14 - (depth / maximumOceanDepth) * 1.65);
        }
      }
      positions.needsUpdate = true;
      meshGeometry.computeVertexNormals();
      bathymetryMesh = new THREE.Mesh(meshGeometry, new THREE.MeshStandardMaterial({ color: 0x47798a, roughness: 0.9, metalness: 0, flatShading: false, side: THREE.DoubleSide }));
      bathymetryMesh.renderOrder = -10;
      scene.add(bathymetryMesh);
      applyViewMode();
    },
    setCyclones(events) {
      hazardMarkers.clear();
      events.forEach((event) => {
        const points = event.coordinates.map(([longitude, latitude]) => new THREE.Vector3(
          ((longitude - payload.longitudes[0]) / longitudeSpan - 0.5) * PLANE_WIDTH,
          ((latitude - payload.latitudes[0]) / latitudeSpan - 0.5) * planeHeight,
          STACK_HEIGHT / 2 + 0.28,
        ));
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xf05a5a, linewidth: 2 }));
        hazardMarkers.add(line);
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf05a5a }));
        marker.position.copy(points[points.length - 1]);
        marker.userData.hazard = event;
        hazardMarkers.add(marker);
      });
    },
    setBackgroundColor(nextColor) {
      scene.background = new THREE.Color(nextColor);
      renderer.setClearColor(nextColor, 1);
    },
    setLandImagery(image) {
      const imageCanvas = document.createElement("canvas");
      imageCanvas.width = image.naturalWidth || image.width;
      imageCanvas.height = image.naturalHeight || image.height;
      const imageContext = imageCanvas.getContext("2d");
      imageContext.drawImage(image, 0, 0);
      landImageData = {
        width: imageCanvas.width,
        height: imageCanvas.height,
        data: imageContext.getImageData(0, 0, imageCanvas.width, imageCanvas.height).data,
      };
      scenePayload.layers.forEach((layer, index) => {
        textures[index].image.data.set(createLayerPixels(layer, sceneRange, sceneScale).pixels);
        textures[index].needsUpdate = true;
      });
    },
    cameraAction(action) {
      const offset = camera.position.clone().sub(controls.target);
      if (action === "rotate") {
        offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 12);
        camera.position.copy(controls.target).add(offset);
      } else if (action === "pan") {
        camera.position.x += 0.8;
        controls.target.x += 0.8;
      } else if (action === "zoom") {
        camera.position.copy(controls.target).add(offset.multiplyScalar(0.82));
      } else if (action === "reset") {
        camera.position.copy(initialCameraPosition);
        controls.target.copy(initialTarget);
      }
      controls.update();
    },
    setCurrentField(field) {
      currentParticles.setField(field);
    },
    setParticlesVisible(visible) {
      sceneParticlesEnabled = visible;
      applyViewMode();
    },
    setInstruments(instruments) {
      instrumentMarkers.clear();
      instruments.forEach((instrument) => {
        const markerElevation = {
          // Keep the marker geometry resting on the surface instead of floating
          // above the map. The small clearance prevents z-fighting only.
          core_argo: 0.11,
          bgc_argo: 0.15,
          glider: 0.15,
          ctd: 0.11,
        }[instrument.instrument_type];
        const marker = new THREE.Mesh(
          markerGeometries[instrument.instrument_type],
          markerMaterials[instrument.instrument_type],
        );
        marker.position.set(
          ((instrument.longitude - payload.longitudes[0]) / longitudeSpan - 0.5) * PLANE_WIDTH,
          ((instrument.latitude - payload.latitudes[0]) / latitudeSpan - 0.5) * planeHeight,
          STACK_HEIGHT / 2 + markerElevation,
        );
        marker.userData.instrument = instrument;
        marker.renderOrder = 100;
        const hitArea = new THREE.Mesh(markerHitGeometry, markerHitMaterial);
        hitArea.userData.instrument = instrument;
        marker.add(hitArea);
        instrumentMarkers.add(marker);
      });
    },
    selectInstrument(instrumentId) {
      instrumentMarkers.children.forEach((marker) => {
        const selected = marker.userData.instrument.id === instrumentId;
        marker.material = selected
          ? selectedMarkerMaterial
          : markerMaterials[marker.userData.instrument.instrument_type];
        marker.scale.setScalar(selected ? 1.65 : 1);
      });
    },
    updateLayers(nextPayload, nextRange, nextScale) {
      scenePayload = nextPayload;
      sceneRange = nextRange;
      sceneScale = nextScale;
      nextPayload.layers.forEach((layer, index) => {
        const textureData = createLayerPixels(layer, nextRange, nextScale);
        textures[index].image.data.set(textureData.pixels);
        textures[index].needsUpdate = true;
      });
      isosurface.updateVolume(nextPayload, nextRange);
      rebuildReliefFigure();
      rebuildIsothermContours();
    },
    setOpacity(nextOpacity) {
      layerOpacity = nextOpacity;
      materials.forEach((material, index) => {
        material.opacity = index === selectedDepthIndex
          ? layerOpacity
          : layerOpacity * 0.3;
        material.needsUpdate = true;
      });
    },
    setVerticalExaggeration(exaggeration) {
      positionDepthLayers(exaggeration);
    },
    setIsosurfaceVisible(visible) {
      sceneIsosurfaceEnabled = visible;
      isosurface.setVisible(visible);
      applyViewMode();
    },
    setIsosurfaceThreshold(threshold) {
      isosurface.setThreshold(threshold);
    },
    setIsothermContoursVisible(visible) {
      sceneIsothermContoursEnabled = visible;
      applyViewMode();
    },
    highlightDepth(selectedIndex) {
      selectedDepthIndex = selectedIndex;
      rebuildReliefFigure();
      rebuildIsothermContours();
      materials.forEach((material, index) => {
        material.opacity = index === selectedIndex
          ? layerOpacity
          : layerOpacity * 0.3;
        material.depthWrite = index === selectedIndex;
        material.needsUpdate = true;
      });
      planes.forEach((plane, index) => {
        plane.renderOrder = index === selectedIndex ? payload.layers.length + 1 : index;
      });
      applyViewMode();
    },
    setViewMode(mode) {
      sceneViewMode = mode;
      applyViewMode();
    },
    setFigureMode(mode) {
      sceneFigureMode = mode;
      applyViewMode();
    },
    dispose() {
      cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener("click", handlePointerClick);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.style.cursor = "";
      renderer.domElement.removeEventListener("pointerdown", preventMiddleMouseDefault);
      renderer.domElement.removeEventListener("mousedown", preventMiddleMouseDefault);
      renderer.domElement.removeEventListener("auxclick", preventMiddleMouseDefault);
      resizeObserver.disconnect();
      controls.dispose();
      Object.values(markerGeometries).forEach((value) => value.dispose());
      Object.values(markerMaterials).forEach((value) => value.dispose());
      markerHitGeometry.dispose();
      markerHitMaterial.dispose();
      selectedMarkerMaterial.dispose();
      isosurface.dispose();
      currentParticles.dispose();
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      geometry.dispose();
      frame.geometry.dispose();
      frame.material.dispose();
      bathymetryMesh?.geometry.dispose();
      bathymetryMesh?.material.dispose();
      disposeFigureMesh(reliefMesh);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function OceanScene3D({ dataSource, initialVariable = "thetao", uploadedInstrumentCount = 0, presentation = false }) {
  const containerRef = useRef(null);
  const scenePanelRef = useRef(null);
  const sceneApiRef = useRef(null);
  const landImageRef = useRef(null);
  const payloadRef = useRef(null);
  const instrumentsRef = useRef([]);
  const [payload, setPayload] = useState(null);
  const [range, setRange] = useState(null);
  const [variable, setVariable] = useState(initialVariable);
  const [scale, setScale] = useState("linear");
  const [opacity, setOpacity] = useState(0.9);
  const [backgroundColor, setBackgroundColor] = useState("#102b40");
  const [verticalExaggeration, setVerticalExaggeration] = useState(1);
  const [isosurfaceEnabled, setIsosurfaceEnabled] = useState(false);
  const [isosurfaceThreshold, setIsosurfaceThreshold] = useState(0);
  const [isothermContoursEnabled, setIsothermContoursEnabled] = useState(false);
  const [controlsError, setControlsError] = useState("");
  const [times, setTimes] = useState([]);
  const [selectedDepthIndex, setSelectedDepthIndex] = useState(0);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
  const [hoveredInstrument, setHoveredInstrument] = useState(null);
  const [hoveredData, setHoveredData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const reducedMotion = presentation && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [particlesEnabled, setParticlesEnabled] = useState(presentation && !reducedMotion);
  const [currentField, setCurrentField] = useState(null);
  const [currentStatus, setCurrentStatus] = useState("off");
  const [fullscreenPanel, setFullscreenPanel] = useState(null);
  const [profileEnlarged, setProfileEnlarged] = useState(false);
  const [infoTopic, setInfoTopic] = useState(null);
  const [cycloneStatus, setCycloneStatus] = useState("off");
  const [viewMode, setViewMode] = useState("composite");
  const [figureMode, setFigureMode] = useState("volume");

  useEffect(() => { setVariable(initialVariable); }, [initialVariable]);

  useEffect(() => {
    let active = true;
    getGibsLandImage().then((image) => {
      if (!active) return;
      landImageRef.current = image;
      sceneApiRef.current?.setLandImagery(image);
    }).catch(() => {
      // The scene remains valid with transparent land cells if imagery is unavailable.
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!payload) return undefined;
    const controller = new AbortController();
    getBathymetry({ signal: controller.signal }).then((data) => {
      sceneApiRef.current?.setBathymetry(data);
    }).catch(() => {
      // The scene remains usable without the optional cached relief mesh.
    });
    return () => controller.abort();
  }, [payload]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenPanel(document.fullscreenElement === scenePanelRef.current ? "scene" : null);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!profileEnlarged) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setProfileEnlarged(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [profileEnlarged]);

  const toggleSceneFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement === scenePanelRef.current) await document.exitFullscreen();
      else await scenePanelRef.current?.requestFullscreen();
    } catch {
      setControlsError("Unable to enlarge the scene panel in this browser.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    payloadRef.current = null;
    setError("");
    setIsUpdating(true);
    getOceanLayers({
      variable,
      source: dataSource,
      signal: controller.signal,
    })
      .then((layersPayload) => {
        payloadRef.current = layersPayload;
        setPayload(layersPayload);
        const nextRange = getFiniteRange(layersPayload.layers.map((layer) => layer.values));
        setRange(nextRange);
        setIsosurfaceThreshold((nextRange.minimum + nextRange.maximum) / 2);
        setScale("linear");
        setTimes(layersPayload.times);
        setSelectedTimeIndex(layersPayload.times.indexOf(layersPayload.time));
        setSelectedDepthIndex(0);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load the 3D ocean depth layers.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsUpdating(false);
        }
      });

    return () => controller.abort();
  }, [dataSource, variable]);

  useEffect(() => {
    if (!containerRef.current || !payload || !range) {
      return;
    }

    if (!sceneApiRef.current) {
      sceneApiRef.current = createOceanScene(
        containerRef.current,
        payload,
        range,
        scale,
        opacity,
        verticalExaggeration,
        isosurfaceEnabled,
        isosurfaceThreshold,
        isothermContoursEnabled,
        backgroundColor,
        setSelectedInstrumentId,
        setHoveredInstrument,
        setHoveredData,
        presentation,
        reducedMotion,
      );
      sceneApiRef.current.setInstruments(instrumentsRef.current);
      if (landImageRef.current) sceneApiRef.current.setLandImagery(landImageRef.current);
      sceneApiRef.current.highlightDepth(selectedDepthIndex);
      sceneApiRef.current.setFigureMode(figureMode);
    } else {
      sceneApiRef.current.updateLayers(payload, range, scale);
    }
  }, [payload, range, scale, presentation, reducedMotion]);

  useEffect(() => () => {
    sceneApiRef.current?.dispose();
    sceneApiRef.current = null;
  }, []);

  useEffect(() => {
    sceneApiRef.current?.highlightDepth(selectedDepthIndex);
  }, [selectedDepthIndex]);

  useEffect(() => {
    sceneApiRef.current?.setOpacity(opacity);
  }, [opacity]);

  useEffect(() => {
    sceneApiRef.current?.setBackgroundColor(backgroundColor);
  }, [backgroundColor]);

  useEffect(() => {
    sceneApiRef.current?.setVerticalExaggeration(verticalExaggeration);
  }, [verticalExaggeration]);


  useEffect(() => {
    sceneApiRef.current?.setIsosurfaceVisible(isosurfaceEnabled);
  }, [isosurfaceEnabled]);

  useEffect(() => {
    sceneApiRef.current?.setViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    sceneApiRef.current?.setFigureMode(figureMode);
  }, [figureMode]);

  useEffect(() => {
    sceneApiRef.current?.setIsosurfaceThreshold(isosurfaceThreshold);
  }, [isosurfaceThreshold]);

  useEffect(() => {
    sceneApiRef.current?.setIsothermContoursVisible(isothermContoursEnabled);
  }, [isothermContoursEnabled]);


  useEffect(() => {
    sceneApiRef.current?.selectInstrument(selectedInstrumentId);
  }, [selectedInstrumentId]);

  useEffect(() => {
    if (!payload) return undefined;
    const controller = new AbortController();
    setCycloneStatus("loading");
    getCyclones({ signal: controller.signal }).then((result) => {
      const margin = 5;
      const minLon = payload.longitudes[0] - margin;
      const maxLon = payload.longitudes.at(-1) + margin;
      const minLat = payload.latitudes[0] - margin;
      const maxLat = payload.latitudes.at(-1) + margin;
      const events = result.events.flatMap((event) => {
        const coordinates = event.coordinates.filter(([lon, lat]) => lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat);
        return coordinates.length ? [{ ...event, coordinates }] : [];
      });
      sceneApiRef.current?.setCyclones(events);
      setCycloneStatus(events.length ? `${events.length} active near extent` : "No active cyclone near extent");
    }).catch((requestError) => {
      if (requestError.name !== "AbortError") { sceneApiRef.current?.setCyclones([]); setCycloneStatus("GDACS unavailable"); }
    });
    return () => controller.abort();
  }, [payload]);

  useEffect(() => {
    if (selectedTimeIndex === null || times.length === 0) {
      return undefined;
    }

    const requestedTime = times[selectedTimeIndex];
    if (payloadRef.current?.source !== dataSource || payloadRef.current?.variable !== variable) {
      return undefined;
    }
    if (payloadRef.current?.time === requestedTime) {
      return undefined;
    }

    const controller = new AbortController();
    setIsUpdating(true);
    setError("");

    getOceanLayers({
      variable,
      time: requestedTime,
      source: dataSource,
      signal: controller.signal,
    })
      .then((layersPayload) => {
        payloadRef.current = layersPayload;
        setPayload(layersPayload);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to update the ocean layers for that model day.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsUpdating(false);
        }
      });

    return () => controller.abort();
  }, [dataSource, selectedTimeIndex, times, variable]);

  useEffect(() => {
    if (dataSource === "upload") {
      setVariable("thetao");
      setParticlesEnabled(false);
      sceneApiRef.current?.setParticlesVisible(false);
    }
  }, [dataSource]);

  useEffect(() => {
    sceneApiRef.current?.setParticlesVisible(particlesEnabled && currentField !== null);
  }, [currentField, particlesEnabled]);

  useEffect(() => {
    if (!particlesEnabled || selectedTimeIndex === null || times.length === 0) {
      setCurrentStatus("off");
      return undefined;
    }

    const controller = new AbortController();
    setCurrentStatus("loading");
    sceneApiRef.current?.setParticlesVisible(false);
    getOceanCurrents({ time: times[selectedTimeIndex], signal: controller.signal })
      .then((field) => {
        setCurrentField(field);
        sceneApiRef.current?.setCurrentField(field);
        sceneApiRef.current?.setParticlesVisible(true);
        setCurrentStatus("ready");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setCurrentStatus("error");
          sceneApiRef.current?.setParticlesVisible(false);
        }
      });

    return () => controller.abort();
  }, [particlesEnabled, selectedTimeIndex, times]);

  const handleTimeChange = useCallback((index) => {
    setSelectedTimeIndex(index);
  }, []);

  const handleInstrumentsLoaded = useCallback((instruments) => {
    instrumentsRef.current = instruments;
    sceneApiRef.current?.setInstruments(instruments);
  }, []);

  const handleRangeChange = useCallback((boundary, value) => {
    if (value === "") {
      setControlsError("Colorbar bounds must be numbers.");
      return;
    }
    const numericValue = Number(value);
    const nextRange = { ...range, [boundary]: numericValue };
    if (!Number.isFinite(numericValue) || nextRange.minimum >= nextRange.maximum) {
      setControlsError("Colorbar minimum must be less than its maximum.");
      return;
    }
    if (scale === "log" && nextRange.minimum <= 0) {
      setControlsError("Logarithmic color scale requires a minimum greater than zero.");
      return;
    }
    setControlsError("");
    setRange(nextRange);
    setIsosurfaceThreshold((threshold) => Math.min(
      nextRange.maximum,
      Math.max(nextRange.minimum, threshold),
    ));
  }, [range, scale]);

  const handleScaleChange = useCallback((nextScale) => {
    if (nextScale === "log" && range.minimum <= 0) {
      setControlsError("Logarithmic color scale requires a minimum greater than zero.");
      return;
    }
    setControlsError("");
    setScale(nextScale);
  }, [range]);

  const unit = displayUnit(payload);
  if (presentation) {
    return (
      <div className="presentation-scene" aria-label="Live three-dimensional Copernicus ocean model view">
        <div className="scene-container" ref={containerRef} />
        {!payload && !error && <div className="loading-overlay"><div className="loading-content"><span className="loading-spinner" /><strong>Loading live ocean layers</strong></div></div>}
        {error && <div className="loading-overlay"><div className="loading-content"><strong role="alert">Data unavailable</strong><span>{error}</span></div></div>}
        {payload && <div className="region-caption"><strong>Live model extent</strong><span>{payload.longitudes[0].toFixed(0)}–{payload.longitudes.at(-1).toFixed(0)}°E · {payload.latitudes[0].toFixed(0)}–{payload.latitudes.at(-1).toFixed(0)}°N</span></div>}
        <div className="bathymetry-caption">Land imagery: NASA GIBS · Seafloor: GEBCO 2026 bathymetry</div>
      </div>
    );
  }
  return (
    <section className="ocean-workspace" aria-labelledby="ocean-scene-title">
      <aside className="control-sidebar" aria-label="Visualization controls" onClick={(event) => {
        if (event.target.closest(".info-tip") && event.target.closest(".control-section")?.textContent.toLowerCase().includes("flow overlay")) {
          setInfoTopic("currents");
        }
      }}>
        <div className="panel-header"><h2>Visual controls</h2><span className="step-label">01 · Configure</span></div>
        {range && <VisualizationControls variable={variable} onVariableChange={setVariable} minimum={range.minimum} maximum={range.maximum} unit={unit} onRangeChange={handleRangeChange} scale={scale} onScaleChange={handleScaleChange} opacity={opacity} onOpacityChange={setOpacity} verticalExaggeration={verticalExaggeration} onVerticalExaggerationChange={setVerticalExaggeration} isosurfaceEnabled={isosurfaceEnabled} onIsosurfaceEnabledChange={setIsosurfaceEnabled} isosurfaceThreshold={isosurfaceThreshold} onIsosurfaceThresholdChange={setIsosurfaceThreshold} isothermContoursEnabled={isothermContoursEnabled} onIsothermContoursChange={setIsothermContoursEnabled} uploadSelected={dataSource === "upload"} error={controlsError} backgroundColor={backgroundColor} onBackgroundColorChange={setBackgroundColor} onInfoOpen={setInfoTopic} viewMode={viewMode} onViewModeChange={setViewMode} figureMode={figureMode} onFigureModeChange={setFigureMode} />}
        {payload && selectedTimeIndex !== null && <DepthTimeSlider depths={payload.layers.map((layer) => layer.depth)} selectedDepthIndex={selectedDepthIndex} onDepthChange={setSelectedDepthIndex} times={times} selectedTimeIndex={selectedTimeIndex} onTimeChange={handleTimeChange} isUpdating={isUpdating} onInfoOpen={setInfoTopic} />}
        {payload && <section className="control-section"><div className="control-kicker">Flow overlay <span className="info-tip" title="Animate particles from real Copernicus uo/vo surface vectors." aria-label="Animate particles from real Copernicus uo/vo surface vectors.">i</span></div><label className="toggle-row" title="Animate real eastward and northward current vectors"><span>Surface currents</span><input aria-label="Animate real surface-current vectors" type="checkbox" checked={particlesEnabled} disabled={dataSource === "upload"} onChange={(event) => setParticlesEnabled(event.target.checked)} /><span className="toggle" aria-hidden="true" /></label><p className="status-copy" aria-live="polite">{currentStatus === "loading" && "Loading uo/vo vectors…"}{currentStatus === "ready" && `${CURRENT_PARTICLE_COUNT} particles · ${currentField.time.slice(0, 10)}`}{currentStatus === "error" && "Current vectors unavailable."}{currentStatus === "off" && "Currently off"}</p><div className="hazard-row"><strong>Cyclone tracking</strong><span className="hazard-status">{cycloneStatus === "loading" ? "Checking GDACS…" : cycloneStatus}</span></div><small className="source-note">Source: GDACS public events API</small></section>}
      </aside>
      <article ref={scenePanelRef} className="scene-panel">
        <div className="scene-topbar"><div><h2 id="ocean-scene-title">{FIGURE_LABELS[figureMode]}</h2><p>{figureMode === "relief" ? "Selected model depth · height follows field value" : "Copernicus model layers · instrument markers"}</p></div><div className="panel-actions"><div className="live-badge"><span />Interactive scene</div><button className="fullscreen-button" type="button" onClick={toggleSceneFullscreen} aria-label={fullscreenPanel === "scene" ? "Exit fullscreen 3D scene" : "View 3D scene fullscreen"} title={fullscreenPanel === "scene" ? "Exit fullscreen" : "View scene fullscreen"}><span aria-hidden="true">{fullscreenPanel === "scene" ? "↙" : "↗"}</span>{fullscreenPanel === "scene" ? "Collapse" : "Enlarge"}</button></div></div>
        <div className="scene-stage">
          <div ref={containerRef} className="scene-container" role="img" aria-label={`Interactive ${FIGURE_LABELS[figureMode].toLowerCase()} of real ${VARIABLE_LABELS[variable].toLowerCase()} model data`} />
          {(!payload || isUpdating) && !error && <div className="loading-overlay"><div className="loading-content"><div className="loading-ring" /><strong>{payload ? "Updating the water column" : "Building the ocean volume"}</strong><span>Reading real model layers…</span></div></div>}
          {error && <div className="loading-overlay"><div className="loading-content"><strong role="alert">Data unavailable</strong><span>{error}</span></div></div>}
          {payload && <div className="region-caption" aria-label={`Loaded region ${payload.latitudes[0].toFixed(1)} to ${payload.latitudes.at(-1).toFixed(1)} north and ${payload.longitudes[0].toFixed(1)} to ${payload.longitudes.at(-1).toFixed(1)} east`}><strong>Model extent</strong><span>{payload.longitudes[0].toFixed(0)}–{payload.longitudes.at(-1).toFixed(0)}°E · {payload.latitudes[0].toFixed(0)}–{payload.latitudes.at(-1).toFixed(0)}°N</span></div>}
            <div className="guided-hint">{figureMode === "volume" ? "Click a marker to compare its observed profile with the model. " : ""}Left drag rotates; middle drag pans; scroll zooms. Close zoom uses interpolated rendering; source resolution remains ~9 km.</div>
          {figureMode === "volume" && <div className="bathymetry-caption">Land imagery: NASA GIBS · Seafloor: GEBCO 2026 bathymetry</div>}
          {hoveredData && <div role="status" className="scene-data-tooltip"><div className="scene-data-tooltip-title"><span className="value-swatch" style={{ background: hoveredData.color }} />{VARIABLE_LABELS[hoveredData.variable] || hoveredData.variable}</div><strong>{hoveredData.value.toFixed(3)} {hoveredData.unit}</strong><div>Depth {hoveredData.depth.toFixed(0)} m</div><div>{hoveredData.latitude.toFixed(2)}°N · {hoveredData.longitude.toFixed(2)}°E</div></div>}
          {hoveredInstrument && <div role="tooltip" className="scene-tooltip" style={{ borderColor: hoveredInstrument.data_status === "sample" ? "#d47cff" : undefined }}><strong>{hoveredInstrument.instrument_label} {hoveredInstrument.platform_number}</strong>{hoveredInstrument.data_status === "sample" && <div>SAMPLE DATA — not live</div>}<div>{hoveredInstrument.variables.join(", ")}</div></div>}
          {payload && range && <div className="scene-legend" aria-label={`Color legend for ${VARIABLE_LABELS[payload.variable] || payload.variable}`}><div className="scene-legend-heading"><strong>{VARIABLE_LABELS[payload.variable] || payload.variable}</strong><span>hover surface for value</span></div><div className="scene-legend-bar" /><div className="scene-legend-scale"><span>{range.minimum.toFixed(2)}</span><span>{((range.minimum + range.maximum) / 2).toFixed(2)}</span><span>{range.maximum.toFixed(2)} {unit}</span></div></div>}
        </div>
        <div className="scene-toolbar" aria-label="3D camera controls">
          <button className="camera-button" type="button" onClick={() => sceneApiRef.current?.cameraAction("rotate")} title="Rotate the camera around the data; left-mouse drag rotates freely"><span aria-hidden="true">↻</span>Rotate</button>
          <button className="camera-button" type="button" onClick={() => sceneApiRef.current?.cameraAction("pan")} title="Pan right; middle-mouse drag pans freely"><span aria-hidden="true">↔</span>Pan</button>
          <button className="camera-button" type="button" onClick={() => sceneApiRef.current?.cameraAction("zoom")} title="Zoom closer; the scroll wheel also zooms"><span aria-hidden="true">＋</span>Zoom</button>
          <button className="camera-button" type="button" onClick={() => sceneApiRef.current?.cameraAction("reset")} title="Reset the camera to the default view"><span aria-hidden="true">⌂</span>Reset</button>
        </div>
        {payload && range && <div className="scene-metadata"><span>Figure <strong>{FIGURE_LABELS[figureMode]}</strong></span><span>Selected depth <strong>{payload.layers[selectedDepthIndex].depth.toFixed(0)} m</strong></span><span>Range <strong>{range.minimum.toFixed(2)}–{range.maximum.toFixed(2)} {unit}</strong></span><span>Scale <strong>{scale}</strong></span><span>Model date <strong>{payload.time.slice(0, 10)}</strong></span></div>}
        <ControlInfoModal topic={infoTopic} onClose={() => setInfoTopic(null)} />
      </article>

      {profileEnlarged && <button className="profile-window-backdrop" type="button" aria-label="Close enlarged observation profile" onClick={() => setProfileEnlarged(false)} />}
      <aside className={`instrument-panel ${profileEnlarged ? "profile-enlarged" : ""}`} aria-label="Observation comparison" role={profileEnlarged ? "dialog" : undefined} aria-modal={profileEnlarged ? "true" : undefined}><div className="panel-header"><h3>Observation profile</h3><div className="panel-actions"><span className="step-label">02 · Validate</span><button className="fullscreen-button" type="button" onClick={() => setProfileEnlarged((enlarged) => !enlarged)} aria-label={profileEnlarged ? "Close enlarged observation profile window" : "Enlarge observation profile in a window"} title={profileEnlarged ? "Close enlarged window" : "Enlarge profile window"}><span aria-hidden="true">{profileEnlarged ? "↙" : "↗"}</span>{profileEnlarged ? "Collapse" : "Enlarge"}</button></div></div><div className="instrument-content"><InstrumentOverlay selectedInstrumentId={selectedInstrumentId} onInstrumentsLoaded={handleInstrumentsLoaded} /></div></aside>
    </section>
  );
}

export default OceanScene3D;
