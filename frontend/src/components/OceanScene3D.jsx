import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getOceanCurrents, getOceanLayers } from "../api/client.js";
import ArgoOverlay from "./ArgoOverlay.jsx";
import DepthTimeSlider from "./DepthTimeSlider.jsx";
import { createColorBuffer, getFiniteRange } from "../utils/colorScale.js";
import {
  createCurrentParticles,
  CURRENT_PARTICLE_COUNT,
} from "../utils/currentParticles.js";

const SCENE_HEIGHT = 560;
const PLANE_WIDTH = 12;
const STACK_HEIGHT = 5;

function createOceanScene(container, payload, range, onArgoSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07131d);

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
  const argoMarkers = new THREE.Group();
  const markerGeometry = new THREE.SphereGeometry(0.1, 16, 12);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffa629 });
  const selectedMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  scene.add(argoMarkers);

  payload.layers.forEach((layer) => {
    const pixels = createColorBuffer(
      layer.values,
      range.minimum,
      range.maximum,
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
      opacity: 0.76,
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

  function handlePointerClick(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(argoMarkers.children, false)[0];
    if (hit) {
      onArgoSelect(hit.object.userData.profileId);
    }
  }
  renderer.domElement.addEventListener("click", handlePointerClick);

  function resize() {
    const width = Math.max(container.clientWidth, 320);
    renderer.setSize(width, SCENE_HEIGHT, false);
    camera.aspect = width / SCENE_HEIGHT;
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
    setCurrentField(field) {
      currentParticles.setField(field);
    },
    setParticlesVisible(visible) {
      currentParticles.points.visible = visible;
    },
    setArgoProfiles(profiles) {
      argoMarkers.clear();
      profiles.forEach((profile) => {
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(
          ((profile.longitude - payload.longitudes[0]) / longitudeSpan - 0.5) * PLANE_WIDTH,
          ((profile.latitude - payload.latitudes[0]) / latitudeSpan - 0.5) * planeHeight,
          STACK_HEIGHT / 2 + 0.18,
        );
        marker.userData.profileId = profile.id;
        marker.renderOrder = 100;
        argoMarkers.add(marker);
      });
    },
    selectArgoProfile(profileId) {
      argoMarkers.children.forEach((marker) => {
        const selected = marker.userData.profileId === profileId;
        marker.material = selected ? selectedMarkerMaterial : markerMaterial;
        marker.scale.setScalar(selected ? 1.65 : 1);
      });
    },
    updateLayers(nextPayload, nextRange) {
      nextPayload.layers.forEach((layer, index) => {
        const pixels = createColorBuffer(
          layer.values,
          nextRange.minimum,
          nextRange.maximum,
        );
        textures[index].image.data.set(pixels);
        textures[index].needsUpdate = true;
      });
    },
    highlightDepth(selectedIndex) {
      materials.forEach((material, index) => {
        material.opacity = index === selectedIndex ? 0.96 : 0.28;
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
      resizeObserver.disconnect();
      controls.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      selectedMarkerMaterial.dispose();
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
  const sceneApiRef = useRef(null);
  const payloadRef = useRef(null);
  const argoProfilesRef = useRef([]);
  const [payload, setPayload] = useState(null);
  const [range, setRange] = useState(null);
  const [times, setTimes] = useState([]);
  const [selectedDepthIndex, setSelectedDepthIndex] = useState(0);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);
  const [selectedArgoProfileId, setSelectedArgoProfileId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [particlesEnabled, setParticlesEnabled] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [currentStatus, setCurrentStatus] = useState("off");

  useEffect(() => {
    const controller = new AbortController();

    setError("");
    getOceanLayers({
      variable: "thetao",
      source: dataSource,
      signal: controller.signal,
    })
      .then((layersPayload) => {
        payloadRef.current = layersPayload;
        setPayload(layersPayload);
        setRange(getFiniteRange(layersPayload.layers.map((layer) => layer.values)));
        setTimes(layersPayload.times);
        setSelectedTimeIndex(layersPayload.times.indexOf(layersPayload.time));
        setSelectedDepthIndex(0);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load the 3D ocean depth layers.");
        }
      });

    return () => controller.abort();
  }, [dataSource]);

  useEffect(() => {
    if (!containerRef.current || !payload || !range) {
      return;
    }

    if (!sceneApiRef.current) {
      sceneApiRef.current = createOceanScene(
        containerRef.current,
        payload,
        range,
        setSelectedArgoProfileId,
      );
      sceneApiRef.current.highlightDepth(selectedDepthIndex);
      sceneApiRef.current.setArgoProfiles(argoProfilesRef.current);
    } else {
      sceneApiRef.current.updateLayers(payload, range);
    }
  }, [payload, range]);

  useEffect(() => () => {
    sceneApiRef.current?.dispose();
    sceneApiRef.current = null;
  }, []);

  useEffect(() => {
    sceneApiRef.current?.highlightDepth(selectedDepthIndex);
  }, [selectedDepthIndex]);

  useEffect(() => {
    sceneApiRef.current?.selectArgoProfile(selectedArgoProfileId);
  }, [selectedArgoProfileId]);

  useEffect(() => {
    if (selectedTimeIndex === null || times.length === 0) {
      return undefined;
    }

    const requestedTime = times[selectedTimeIndex];
    if (payloadRef.current?.source !== dataSource) {
      return undefined;
    }
    if (payloadRef.current?.time === requestedTime) {
      return undefined;
    }

    const controller = new AbortController();
    setIsUpdating(true);
    setError("");

    getOceanLayers({
      variable: "thetao",
      time: requestedTime,
      source: dataSource,
      signal: controller.signal,
    })
      .then((layersPayload) => {
        payloadRef.current = layersPayload;
        setPayload(layersPayload);
        setRange(getFiniteRange(layersPayload.layers.map((layer) => layer.values)));
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
  }, [dataSource, selectedTimeIndex, times]);

  useEffect(() => {
    if (dataSource === "upload") {
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

  const handleArgoProfilesLoaded = useCallback((profiles) => {
    argoProfilesRef.current = profiles;
    sceneApiRef.current?.setArgoProfiles(profiles);
  }, []);

  return (
    <section aria-labelledby="ocean-scene-title">
      <h2 id="ocean-scene-title">3D temperature depth stack</h2>
      <p>Drag to rotate · Scroll to zoom</p>
      {!payload && !error && <p>Loading eight Copernicus Marine depth layers…</p>}
      {error && <p role="alert">{error}</p>}
      {payload && selectedTimeIndex !== null && (
        <DepthTimeSlider
          depths={payload.layers.map((layer) => layer.depth)}
          selectedDepthIndex={selectedDepthIndex}
          onDepthChange={setSelectedDepthIndex}
          times={times}
          selectedTimeIndex={selectedTimeIndex}
          onTimeChange={handleTimeChange}
          isUpdating={isUpdating}
        />
      )}
      {payload && (
        <div
          style={{
            margin: "0 0 16px",
            padding: "12px 16px",
            border: "1px solid #526978",
            background: "#102430",
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={particlesEnabled}
              disabled={dataSource === "upload"}
              onChange={(event) => setParticlesEnabled(event.target.checked)}
            />{" "}
            <strong>Animate real surface currents</strong>
          </label>
          <span aria-live="polite" style={{ marginLeft: "12px" }}>
            {currentStatus === "loading" && "Loading uo/vo vectors…"}
            {currentStatus === "ready" && `${CURRENT_PARTICLE_COUNT} particles · ${currentField.time.slice(0, 10)} · ${currentField.depth.toFixed(2)} m`}
            {currentStatus === "error" && "Current vectors unavailable."}
            {currentStatus === "off" && "Off"}
            {dataSource === "upload" && " · currents require the demo uo/vo dataset"}
          </span>
          {currentStatus === "ready" && (
            <div style={{ marginTop: "6px" }}>
              Motion follows Copernicus eastward (uo) and northward (vo) velocity in {currentField.unit}.
            </div>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        role="img"
        aria-label="Rotatable stack of eight sea temperature planes from the surface to 1942 metres"
        style={{
          display: payload ? "block" : "none",
          width: "100%",
          minHeight: `${SCENE_HEIGHT}px`,
          overflow: "hidden",
          border: "1px solid #526978",
          background: "#07131d",
        }}
      />
      {payload && range && (
        <p>
          Depths: {payload.layers.map((layer) => layer.depth.toFixed(0)).join(", ")} m
          {" · "}{range.minimum.toFixed(2)}–{range.maximum.toFixed(2)} °C
          {" · Selected: "}{payload.layers[selectedDepthIndex].depth.toFixed(0)} m
          {" · "}{payload.time.slice(0, 10)}
          {" · "}{payload.source === "demo" ? "Demo dataset" : "My upload"}
        </p>
      )}
      <ArgoOverlay
        selectedProfileId={selectedArgoProfileId}
        onProfilesLoaded={handleArgoProfilesLoaded}
      />
    </section>
  );
}

export default OceanScene3D;
