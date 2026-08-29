import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getOceanCurrents, getOceanLayers } from "../api/client.js";
import InstrumentOverlay from "./InstrumentOverlay.jsx";
import DepthTimeSlider from "./DepthTimeSlider.jsx";
import VisualizationControls from "./VisualizationControls.jsx";
import { createColorBuffer, getFiniteRange } from "../utils/colorScale.js";
import {
  createCurrentParticles,
  CURRENT_PARTICLE_COUNT,
} from "../utils/currentParticles.js";
import { createIsosurface } from "../utils/isosurface.js";

const PLANE_WIDTH = 12;
const STACK_HEIGHT = 5;
const VARIABLE_LABELS = {
  thetao: "Temperature",
  so: "Salinity",
  current_magnitude: "Current magnitude",
};

function displayUnit(payload) {
  return payload?.variable === "so" ? "PSU" : payload?.unit || "";
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
  onInstrumentSelect,
  onInstrumentHover,
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07131d);
  scene.add(new THREE.HemisphereLight(0xcceeff, 0x13202a, 2.1));
  const isosurfaceLight = new THREE.DirectionalLight(0xffffff, 2.2);
  isosurfaceLight.position.set(6, -8, 10);
  scene.add(isosurfaceLight);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(10, -13, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
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
  const currentParticles = createCurrentParticles({
    planeWidth: PLANE_WIDTH,
    planeHeight,
    surfaceZ: STACK_HEIGHT / 2,
  });
  scene.add(currentParticles.points);
  const isosurface = createIsosurface(payload, range, PLANE_WIDTH, planeHeight, STACK_HEIGHT);
  scene.add(isosurface.mesh);
  isosurface.setThreshold(isosurfaceThreshold);
  isosurface.setVisible(isosurfaceEnabled);
  const instrumentMarkers = new THREE.Group();
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
  const selectedMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  scene.add(instrumentMarkers);

  payload.layers.forEach((layer) => {
    const pixels = createColorBuffer(
      layer.values,
      range.minimum,
      range.maximum,
      { scale },
    );
    const texture = new THREE.DataTexture(
      pixels,
      payload.longitudes.length,
      payload.latitudes.length,
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
  let selectedDepthIndex = 0;
  let layerOpacity = opacity;

  function positionDepthLayers(exaggeration) {
    planes.forEach((plane, index) => {
      plane.position.z = STACK_HEIGHT / 2
        - (payload.layers[index].depth / maximumDepth) * STACK_HEIGHT * exaggeration;
    });
    frame.scale.z = exaggeration;
    frame.position.z = STACK_HEIGHT / 2 - (STACK_HEIGHT * exaggeration) / 2;
    isosurface.setVerticalExaggeration(exaggeration);
  }
  positionDepthLayers(verticalExaggeration);

  function handlePointerClick(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(instrumentMarkers.children, false)[0];
    if (hit) {
      onInstrumentSelect(hit.object.userData.instrument.id);
    }
  }
  function handlePointerMove(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(instrumentMarkers.children, false)[0];
    onInstrumentHover(hit?.object.userData.instrument || null);
  }
  renderer.domElement.addEventListener("click", handlePointerClick);
  renderer.domElement.addEventListener("pointermove", handlePointerMove);

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
    setInteractionMode(mode) {
      controls.mouseButtons.LEFT = mode === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    },
    setCurrentField(field) {
      currentParticles.setField(field);
    },
    setParticlesVisible(visible) {
      currentParticles.points.visible = visible;
    },
    setInstruments(instruments) {
      instrumentMarkers.clear();
      instruments.forEach((instrument) => {
        const markerElevation = {
          core_argo: 0.18,
          bgc_argo: 0.4,
          glider: 0.62,
          ctd: 0.62,
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
      nextPayload.layers.forEach((layer, index) => {
        const pixels = createColorBuffer(
          layer.values,
          nextRange.minimum,
          nextRange.maximum,
          { scale: nextScale },
        );
        textures[index].image.data.set(pixels);
        textures[index].needsUpdate = true;
      });
      isosurface.updateVolume(nextPayload, nextRange);
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
      isosurface.setVisible(visible);
    },
    setIsosurfaceThreshold(threshold) {
      isosurface.setThreshold(threshold);
    },
    highlightDepth(selectedIndex) {
      selectedDepthIndex = selectedIndex;
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
    },
    dispose() {
      cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener("click", handlePointerClick);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
      controls.dispose();
      Object.values(markerGeometries).forEach((value) => value.dispose());
      Object.values(markerMaterials).forEach((value) => value.dispose());
      selectedMarkerMaterial.dispose();
      isosurface.dispose();
      currentParticles.dispose();
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      geometry.dispose();
      frame.geometry.dispose();
      frame.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function OceanScene3D({ dataSource }) {
  const containerRef = useRef(null);
  const scenePanelRef = useRef(null);
  const instrumentPanelRef = useRef(null);
  const sceneApiRef = useRef(null);
  const payloadRef = useRef(null);
  const instrumentsRef = useRef([]);
  const [payload, setPayload] = useState(null);
  const [range, setRange] = useState(null);
  const [variable, setVariable] = useState("thetao");
  const [scale, setScale] = useState("linear");
  const [opacity, setOpacity] = useState(0.9);
  const [verticalExaggeration, setVerticalExaggeration] = useState(1);
  const [isosurfaceEnabled, setIsosurfaceEnabled] = useState(false);
  const [isosurfaceThreshold, setIsosurfaceThreshold] = useState(0);
  const [controlsError, setControlsError] = useState("");
  const [times, setTimes] = useState([]);
  const [selectedDepthIndex, setSelectedDepthIndex] = useState(0);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
  const [hoveredInstrument, setHoveredInstrument] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [particlesEnabled, setParticlesEnabled] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [currentStatus, setCurrentStatus] = useState("off");
  const [interactionMode, setInteractionMode] = useState("rotate");
  const [fullscreenPanel, setFullscreenPanel] = useState(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement === scenePanelRef.current) setFullscreenPanel("scene");
      else if (document.fullscreenElement === instrumentPanelRef.current) setFullscreenPanel("profile");
      else setFullscreenPanel(null);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    sceneApiRef.current?.setInteractionMode(interactionMode);
  }, [interactionMode]);

  const toggleFullscreen = useCallback(async (panel, panelRef) => {
    try {
      if (document.fullscreenElement === panelRef.current) await document.exitFullscreen();
      else await panelRef.current?.requestFullscreen();
    } catch {
      setControlsError(`Unable to enlarge the ${panel} panel in this browser.`);
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
        setSelectedInstrumentId,
        setHoveredInstrument,
      );
      sceneApiRef.current.setInteractionMode(interactionMode);
      sceneApiRef.current.setInstruments(instrumentsRef.current);
      sceneApiRef.current.highlightDepth(selectedDepthIndex);
    } else {
      sceneApiRef.current.updateLayers(payload, range, scale);
    }
  }, [payload, range, scale]);

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
    sceneApiRef.current?.setVerticalExaggeration(verticalExaggeration);
  }, [verticalExaggeration]);

  useEffect(() => {
    sceneApiRef.current?.setIsosurfaceVisible(isosurfaceEnabled);
  }, [isosurfaceEnabled]);

  useEffect(() => {
    sceneApiRef.current?.setIsosurfaceThreshold(isosurfaceThreshold);
  }, [isosurfaceThreshold]);

  useEffect(() => {
    sceneApiRef.current?.selectInstrument(selectedInstrumentId);
  }, [selectedInstrumentId]);

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
  return (
    <section className="ocean-workspace" aria-labelledby="ocean-scene-title">
      <aside className="control-sidebar" aria-label="Visualization controls">
        <div className="panel-header"><h2>Visual controls</h2><span className="step-label">01 · Configure</span></div>
        {range && <VisualizationControls variable={variable} onVariableChange={setVariable} minimum={range.minimum} maximum={range.maximum} unit={unit} onRangeChange={handleRangeChange} scale={scale} onScaleChange={handleScaleChange} opacity={opacity} onOpacityChange={setOpacity} verticalExaggeration={verticalExaggeration} onVerticalExaggerationChange={setVerticalExaggeration} isosurfaceEnabled={isosurfaceEnabled} onIsosurfaceEnabledChange={setIsosurfaceEnabled} isosurfaceThreshold={isosurfaceThreshold} onIsosurfaceThresholdChange={setIsosurfaceThreshold} uploadSelected={dataSource === "upload"} error={controlsError} />}
        {payload && selectedTimeIndex !== null && <DepthTimeSlider depths={payload.layers.map((layer) => layer.depth)} selectedDepthIndex={selectedDepthIndex} onDepthChange={setSelectedDepthIndex} times={times} selectedTimeIndex={selectedTimeIndex} onTimeChange={handleTimeChange} isUpdating={isUpdating} />}
        {payload && <section className="control-section"><div className="control-kicker">Flow overlay <span className="info-tip" title="Animate particles from real Copernicus uo/vo surface vectors." aria-label="Animate particles from real Copernicus uo/vo surface vectors.">i</span></div><label className="toggle-row" title="Animate real eastward and northward current vectors"><span>Surface currents</span><input aria-label="Animate real surface-current vectors" type="checkbox" checked={particlesEnabled} disabled={dataSource === "upload"} onChange={(event) => setParticlesEnabled(event.target.checked)} /><span className="toggle" aria-hidden="true" /></label><p className="status-copy" aria-live="polite">{currentStatus === "loading" && "Loading uo/vo vectors…"}{currentStatus === "ready" && `${CURRENT_PARTICLE_COUNT} particles · ${currentField.time.slice(0, 10)}`}{currentStatus === "error" && "Current vectors unavailable."}{currentStatus === "off" && "Currently off"}</p></section>}
      </aside>

      <article ref={scenePanelRef} className={`scene-panel interaction-${interactionMode}`}>
        <header className="scene-topbar"><div><h2 id="ocean-scene-title">3D {VARIABLE_LABELS[variable]} volume</h2><p>{dataSource === "demo" ? "Copernicus Marine · India EEZ" : "Scientist-uploaded NetCDF"}</p></div><div className="panel-actions"><div className="live-badge"><span />Data linked</div><button className="fullscreen-button" type="button" onClick={() => toggleFullscreen("scene", scenePanelRef)} aria-label={fullscreenPanel === "scene" ? "Exit fullscreen 3D scene" : "View 3D scene fullscreen"} title={fullscreenPanel === "scene" ? "Exit fullscreen" : "View scene fullscreen"}><span aria-hidden="true">{fullscreenPanel === "scene" ? "↙" : "↗"}</span>{fullscreenPanel === "scene" ? "Collapse" : "Enlarge"}</button></div></header>
        <div className="scene-stage">
          <div ref={containerRef} className="scene-container" role="img" aria-label={`Rotatable ${VARIABLE_LABELS[variable].toLowerCase()} stack with Core Argo, BGC-Argo, and labelled sample Glider and CTD markers`} />
          {(!payload || isUpdating) && !error && <div className="loading-overlay"><div className="loading-content"><div className="loading-ring" /><strong>{payload ? "Updating the water column" : "Building the ocean volume"}</strong><span>Reading real model layers…</span></div></div>}
          {error && <div className="loading-overlay"><div className="loading-content"><strong role="alert">Data unavailable</strong><span>{error}</span></div></div>}
          {payload && <div className="region-map" aria-label={`Loaded region ${payload.latitudes[0].toFixed(1)} to ${payload.latitudes.at(-1).toFixed(1)} north and ${payload.longitudes[0].toFixed(1)} to ${payload.longitudes.at(-1).toFixed(1)} east`}><header><span>Region</span><span>Model extent</span></header><div className="region-box"><div className="region-extent" /></div><div className="region-coords"><span>{payload.longitudes[0].toFixed(0)}–{payload.longitudes.at(-1).toFixed(0)}°E</span><span>{payload.latitudes[0].toFixed(0)}–{payload.latitudes.at(-1).toFixed(0)}°N</span></div></div>}
          <div className="guided-hint">Click a marker to compare its observed profile with the model. Left drag {interactionMode === "pan" ? "pans" : "rotates"}; scroll zooms.</div>
          {hoveredInstrument && <div role="tooltip" className="scene-tooltip" style={{ borderColor: hoveredInstrument.data_status === "sample" ? "#d47cff" : undefined }}><strong>{hoveredInstrument.instrument_label} {hoveredInstrument.platform_number}</strong>{hoveredInstrument.data_status === "sample" && <div>SAMPLE DATA — not live</div>}<div>{hoveredInstrument.variables.join(", ")}</div></div>}
        </div>
        <div className="scene-toolbar" aria-label="3D camera controls">
          <button className={`camera-button ${interactionMode === "rotate" ? "active" : ""}`} type="button" onClick={() => setInteractionMode("rotate")} title="Use left-click drag to rotate" aria-pressed={interactionMode === "rotate"}><span aria-hidden="true">↻</span>Rotate</button>
          <button className={`camera-button ${interactionMode === "pan" ? "active" : ""}`} type="button" onClick={() => setInteractionMode("pan")} title="Use left-click drag to pan" aria-pressed={interactionMode === "pan"}><span aria-hidden="true">↔</span>Pan</button>
          <button className="camera-button" type="button" onClick={() => sceneApiRef.current?.cameraAction("zoom")} title="Zoom closer; the scroll wheel also zooms"><span aria-hidden="true">＋</span>Zoom</button>
          <button className="camera-button" type="button" onClick={() => sceneApiRef.current?.cameraAction("reset")} title="Reset the camera to the default view"><span aria-hidden="true">⌂</span>Reset</button>
        </div>
        {payload && range && <div className="scene-metadata"><span>Selected depth <strong>{payload.layers[selectedDepthIndex].depth.toFixed(0)} m</strong></span><span>Range <strong>{range.minimum.toFixed(2)}–{range.maximum.toFixed(2)} {unit}</strong></span><span>Scale <strong>{scale}</strong></span><span>Model date <strong>{payload.time.slice(0, 10)}</strong></span></div>}
      </article>

      <aside ref={instrumentPanelRef} className="instrument-panel" aria-label="Observation comparison"><div className="panel-header"><h3>Observation profile</h3><div className="panel-actions"><span className="step-label">02 · Validate</span><button className="fullscreen-button" type="button" onClick={() => toggleFullscreen("profile", instrumentPanelRef)} aria-label={fullscreenPanel === "profile" ? "Exit fullscreen observation profile" : "View observation profile fullscreen"} title={fullscreenPanel === "profile" ? "Exit fullscreen" : "View profile fullscreen"}><span aria-hidden="true">{fullscreenPanel === "profile" ? "↙" : "↗"}</span>{fullscreenPanel === "profile" ? "Collapse" : "Enlarge"}</button></div></div><div className="instrument-content"><InstrumentOverlay selectedInstrumentId={selectedInstrumentId} onInstrumentsLoaded={handleInstrumentsLoaded} /></div></aside>
    </section>
  );
}

export default OceanScene3D;
