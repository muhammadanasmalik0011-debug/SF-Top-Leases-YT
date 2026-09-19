import * as Cesium from 'cesium';

const SF_HOME = { lon: -122.3987, lat: 37.7888, height: 1650 };
const PIN_BLUE = Cesium.Color.fromCssColorString('#72c4ff');
const PIN_BLUE_ACTIVE = Cesium.Color.fromCssColorString('#0a4f91');
const WHITE = Cesium.Color.WHITE;

function alive(viewer) {
  return Boolean(viewer && !viewer.isDestroyed());
}

export function createViewer(container, ionToken, { compact = false } = {}) {
  if (!container) throw new Error('Cesium container is not available.');
  if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;

  const osm = new Cesium.OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/',
  });

  const viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayer: new Cesium.ImageryLayer(osm),
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });

  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = false;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#eef1f4');

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  viewer.resolutionScale = Math.min(Math.max(dpr, 1), 1.45);
  if (viewer.scene.postProcessStages?.fxaa) viewer.scene.postProcessStages.fxaa.enabled = true;

  viewer.cesiumWidget.creditContainer.classList.add('pm-map-credits');
  if (compact && viewer.geocoder?.container) viewer.geocoder.container.classList.add('pm-compact-geocoder');

  flyHome(viewer, '3d', 0);
  return viewer;
}

export async function addPhotorealistic(viewer) {
  if (!alive(viewer)) return null;

  try {
    const tileset = await Cesium.createGooglePhotorealistic3DTileset({
      onlyUsingWithGoogleGeocoder: true,
    });

    if (!alive(viewer)) {
      if (!tileset.isDestroyed()) tileset.destroy();
      return null;
    }

    tileset.maximumScreenSpaceError = 12;
    tileset.dynamicScreenSpaceError = false;
    tileset.preloadFlightDestinations = true;
    tileset.show = false;
    viewer.scene.primitives.add(tileset);
    viewer.scene.requestRender();
    return tileset;
  } catch (error) {
    if (alive(viewer)) console.error('Photorealistic 3D Tiles failed to load:', error);
    return null;
  }
}

export function sharpenPhotorealistic(viewer, tileset) {
  if (!alive(viewer) || !tileset || tileset.isDestroyed()) return;
  tileset.maximumScreenSpaceError = 7;
  viewer.scene.requestRender();
}

export function setMode(viewer, tileset, mode) {
  if (!alive(viewer)) return;
  const is3d = mode === '3d';

  if (tileset && !tileset.isDestroyed()) tileset.show = is3d;
  viewer.scene.globe.show = !is3d;

  for (const entity of viewer.entities.values) {
    if (!entity.point) continue;
    const sampledRoofHeight = entity.properties?.roofHeight?.getValue?.(viewer.clock.currentTime);
    if (is3d && sampledRoofHeight != null && Number.isFinite(Number(sampledRoofHeight))) {
      entity.point.heightReference = Cesium.HeightReference.NONE;
    } else {
      entity.point.heightReference = is3d
        ? Cesium.HeightReference.CLAMP_TO_3D_TILE
        : Cesium.HeightReference.CLAMP_TO_GROUND;
    }
  }

  if (is3d && viewer.scene.mode !== Cesium.SceneMode.SCENE3D) viewer.scene.morphTo3D(0.32);
  if (!is3d && viewer.scene.mode !== Cesium.SceneMode.SCENE2D) viewer.scene.morphTo2D(0.32);
  viewer.scene.requestRender();
}

export function flyHome(viewer, mode = '3d', duration = 0.85) {
  if (!alive(viewer)) return;
  if (mode === '2d' || viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(-122.418, 37.773, -122.383, 37.803),
      duration,
    });
    return;
  }

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(SF_HOME.lon, SF_HOME.lat, SF_HOME.height),
    orientation: {
      heading: Cesium.Math.toRadians(28),
      pitch: Cesium.Math.toRadians(-37),
      roll: 0,
    },
    duration,
  });
}

export function addPin(viewer, {
  id,
  lon,
  lat,
  label = '',
  meta = {},
  roofHeight = null,
  heightReference = Cesium.HeightReference.CLAMP_TO_3D_TILE,
}) {
  if (!alive(viewer) || lon == null || lat == null) return null;

  const sampled = roofHeight != null && Number.isFinite(Number(roofHeight)) ? Number(roofHeight) : null;
  const pointHeight = sampled == null ? 0 : sampled + 1.2;

  return viewer.entities.add({
    id: `property-${id}`,
    name: label,
    properties: { ...meta, roofHeight: sampled },
    position: Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), pointHeight),
    point: {
      pixelSize: 11,
      color: PIN_BLUE,
      outlineColor: WHITE,
      outlineWidth: 2,
      heightReference: sampled == null ? heightReference : Cesium.HeightReference.NONE,
      disableDepthTestDistance: 0,
      scaleByDistance: new Cesium.NearFarScalar(280, 1.35, 5200, 0.58),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6500),
      translucencyByDistance: new Cesium.NearFarScalar(400, 1, 6000, 0.36),
    },
    label: {
      text: label,
      show: false,
      font: '600 12px Inter, Arial, sans-serif',
      fillColor: Cesium.Color.fromCssColorString('#20242a'),
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString('#fffffff5'),
      backgroundPadding: new Cesium.Cartesian2(8, 5),
      pixelOffset: new Cesium.Cartesian2(0, -18),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: 0,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000),
    },
  });
}

export async function sampleRoofHeight(viewer, lon, lat) {
  if (!alive(viewer) || viewer.scene.mode !== Cesium.SceneMode.SCENE3D) return null;
  if (!viewer.scene.sampleHeightSupported) return null;

  try {
    const cartographic = Cesium.Cartographic.fromDegrees(Number(lon), Number(lat), 0);
    const sampled = await viewer.scene.sampleHeightMostDetailed([cartographic]);
    const height = sampled?.[0]?.height;
    return Number.isFinite(Number(height)) ? Number(height) : null;
  } catch (error) {
    return null;
  }
}

export function setPinRoofHeight(viewer, propertyId, lon, lat, roofHeight) {
  if (!alive(viewer) || roofHeight == null || !Number.isFinite(Number(roofHeight))) return;
  const entity = viewer.entities.getById(`property-${propertyId}`);
  if (!entity) return;

  const h = Number(roofHeight);
  entity.position = Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), h + 1.2);
  if (entity.properties?.roofHeight?.setValue) entity.properties.roofHeight.setValue(h);
  if (entity.point) {
    entity.point.heightReference = Cesium.HeightReference.NONE;
    entity.point.disableDepthTestDistance = 0;
  }
  viewer.scene.requestRender();
}

export function setActivePin(viewer, propertyId) {
  if (!alive(viewer)) return;
  for (const entity of viewer.entities.values) {
    if (!String(entity.id || '').startsWith('property-')) continue;
    const active = entity.id === `property-${propertyId}`;
    if (entity.label) entity.label.show = active;
    if (entity.point) {
      entity.point.pixelSize = active ? 18 : 11;
      entity.point.color = active ? PIN_BLUE_ACTIVE : PIN_BLUE;
      entity.point.outlineColor = WHITE;
      entity.point.outlineWidth = active ? 4 : 2;
      entity.point.scaleByDistance = active
        ? new Cesium.NearFarScalar(250, 1.4, 9000, 0.72)
        : new Cesium.NearFarScalar(280, 1.35, 5200, 0.58);
      entity.point.distanceDisplayCondition = active
        ? new Cesium.DistanceDisplayCondition(0, 12000)
        : new Cesium.DistanceDisplayCondition(0, 6500);
      entity.point.translucencyByDistance = active
        ? new Cesium.NearFarScalar(400, 1, 11000, 0.75)
        : new Cesium.NearFarScalar(400, 1, 6000, 0.36);
    }
  }
  viewer.scene.requestRender();
}

function normalizeFlyOptions(heightOrOptions) {
  if (heightOrOptions && typeof heightOrOptions === 'object') return heightOrOptions;
  return { height: Number(heightOrOptions) || 650 };
}

export function flyTo(viewer, lon, lat, heightOrOptions = 650) {
  if (!alive(viewer) || lon == null || lat == null) return;
  const x = Number(lon);
  const y = Number(lat);
  const options = normalizeFlyOptions(heightOrOptions);
  const duration = options.duration ?? 1.0;

  if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
    const dx = options.dx ?? 0.0039;
    const dy = options.dy ?? 0.0028;
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(x - dx, y - dy, x + dx, y + dy),
      duration,
      complete: options.complete,
    });
    return;
  }

  const targetHeight = options.targetHeight ?? 45;
  const target = Cesium.Cartesian3.fromDegrees(x, y, targetHeight);
  const sphere = new Cesium.BoundingSphere(target, options.radius ?? 90);
  viewer.camera.flyToBoundingSphere(sphere, {
    offset: new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(options.heading ?? 32),
      Cesium.Math.toRadians(options.pitch ?? -24),
      options.range ?? Math.max(Number(options.height) || 650, 430),
    ),
    duration,
    complete: options.complete,
  });
}

export function worldToScreen(viewer, lon, lat, height = 45) {
  if (!alive(viewer) || lon == null || lat == null) return null;
  const point = Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), Number(height) || 0);
  const windowPoint = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, point);
  if (!Cesium.defined(windowPoint)) return null;
  return { x: windowPoint.x, y: windowPoint.y };
}

export function pinToScreen(viewer, propertyId) {
  if (!alive(viewer) || propertyId == null) return null;
  const entity = viewer.entities.getById(`property-${propertyId}`);
  if (!entity?.position) return null;
  const world = entity.position.getValue(viewer.clock.currentTime);
  if (!Cesium.defined(world)) return null;
  const windowPoint = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, world);
  if (!Cesium.defined(windowPoint)) return null;
  return { x: windowPoint.x, y: windowPoint.y };
}

export function screenToLonLat(viewer, position) {
  if (!alive(viewer)) return null;

  let cartesian;
  if (viewer.scene.pickPositionSupported) cartesian = viewer.scene.pickPosition(position);
  if (!Cesium.defined(cartesian)) cartesian = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
  if (!Cesium.defined(cartesian)) return null;

  const c = Cesium.Cartographic.fromCartesian(cartesian);
  return {
    lon: Cesium.Math.toDegrees(c.longitude),
    lat: Cesium.Math.toDegrees(c.latitude),
  };
}

export async function googleGeocode(viewer, query, token) {
  if (!alive(viewer) || !query?.trim()) return [];
  const geocoder = new Cesium.IonGeocoderService({
    scene: viewer.scene,
    accessToken: token || Cesium.Ion.defaultAccessToken,
    geocodeProviderType: Cesium.IonGeocodeProviderType.GOOGLE,
  });
  return geocoder.geocode(query.trim());
}

export function destinationCenter(destination) {
  if (destination instanceof Cesium.Rectangle) {
    const c = Cesium.Rectangle.center(destination);
    return { lon: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude) };
  }
  if (destination instanceof Cesium.Cartesian3) {
    const c = Cesium.Cartographic.fromCartesian(destination);
    return { lon: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude) };
  }
  return null;
}

export function viewerAlive(viewer) {
  return alive(viewer);
}

export { Cesium };
