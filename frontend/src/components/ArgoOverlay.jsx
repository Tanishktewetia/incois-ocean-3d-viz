import { useEffect, useState } from "react";
import { getArgoProfile, getArgoProfiles } from "../api/client.js";
import ProfileChart from "./ProfileChart.jsx";

function ArgoOverlay({ selectedProfileId, onProfilesLoaded }) {
  const [catalog, setCatalog] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getArgoProfiles({ signal: controller.signal })
      .then((payload) => {
        setCatalog(payload);
        onProfilesLoaded(payload.profiles);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load the Argo GDAC float locations.");
        }
      });
    return () => controller.abort();
  }, [onProfilesLoaded]);

  useEffect(() => {
    setProfile(null);
    if (!selectedProfileId) {
      return undefined;
    }
    const controller = new AbortController();
    setError("");
    getArgoProfile(selectedProfileId, { signal: controller.signal })
      .then(setProfile)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load that Argo temperature profile.");
        }
      });
    return () => controller.abort();
  }, [selectedProfileId]);

  return (
    <section aria-labelledby="argo-profile-title">
      <h3 id="argo-profile-title">Argo observations</h3>
      {!catalog && !error && <p>Loading real Argo GDAC profiles…</p>}
      {catalog && (
        <p>
          {catalog.profiles.length} profiles from {catalog.start_time.slice(0, 10)} to{" "}
          {catalog.end_time.slice(0, 10)}. Click an orange dot in the 3D scene.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {selectedProfileId && !profile && !error && <p>Loading selected profile…</p>}
      {profile && (
        <article>
          <h4>
            Float {profile.platform_number}, cycle {profile.cycle_number}
          </h4>
          <p>
            {profile.time.replace("T", " ").replace("Z", " UTC")} ·{" "}
            {profile.latitude.toFixed(3)}°N, {profile.longitude.toFixed(3)}°E ·{" "}
            {profile.levels} QC-accepted levels · {profile.maximum_depth.toFixed(0)} m
          </p>
          <ProfileChart profile={profile} />
        </article>
      )}
    </section>
  );
}

export default ArgoOverlay;
