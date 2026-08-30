const GIBS_GET_MAP_URL = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?service=WMS&request=GetMap&version=1.1.1&layers=MODIS_Terra_CorrectedReflectance_TrueColor&styles=&srs=EPSG:4326&bbox=68,5,90,22&width=660&height=510&format=image/jpeg&transparent=false";

let cachedImagePromise;

export function getGibsLandImage() {
  if (!cachedImagePromise) {
    cachedImagePromise = fetch(GIBS_GET_MAP_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`NASA GIBS returned ${response.status}`);
        return response.blob();
      })
      .then((blob) => new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(blob);
        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("NASA GIBS imagery could not be decoded."));
        };
        image.src = objectUrl;
      }));
  }
  return cachedImagePromise;
}

export { GIBS_GET_MAP_URL };
