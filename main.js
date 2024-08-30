import "./style.css";
import { Feature, Map, View } from "ol";
import { Modify } from "ol/interaction.js";
import { saveAs } from 'file-saver';
import { Stroke, Style, Icon, Fill, Text } from "ol/style.js";
import { toLonLat } from "ol/proj.js";
import { toStringXY } from "ol/coordinate";
import { Vector as VectorLayer } from "ol/layer.js";
import { GPX, GeoJSON, KML } from 'ol/format.js';
import KeyboardPan from "ol/interaction/KeyboardPan.js";
import LineString from "ol/geom/LineString";
import OSM from "ol/source/OSM.js";
import Overlay from "ol/Overlay.js";
import Point from "ol/geom/Point.js";
import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS.js";
import VectorSource from "ol/source/Vector.js";
import XYZ from "ol/source/XYZ.js";

// const popupContent = document.getElementById('popup-content');
const addPositionButton = document.getElementById("addPositionButton");
const coordsDiv = document.getElementById("coordsDiv");
const defaultCenter = [1700000, 8500000];
const defaultZoom = 5;
const exportRouteButton = document.getElementById("exportRouteButton");
const fileNameInput = document.getElementById("fileNameInput");
const info2Div = document.getElementById("info2");
const info3Div = document.getElementById("info3");
const info4Div = document.getElementById("info4");
const infoDiv = document.getElementById("info");
const layerSelector = document.getElementById("layerSelector");
const popupCloser = document.getElementById("popup-closer");
const popupContainer = document.getElementById("popup");
const removePositionButton = document.getElementById("removePositionButton");
const savePoiButton = document.getElementById("savePoiButton");
const savePoiNameButton = document.getElementById("savePoiNameButton");
const showGPXdiv = document.getElementById("showGPXdiv");
const touchFriendlyCheck = document.getElementById("touchFriendlyCheck");
const reverseRoute = document.getElementById("reverseRoute");
let gpxFileName;
let poiCoordinate;
let trackLength = 0;
let trackPointStraight = {};
localStorage.centerCoordinate = localStorage.centerCoordinate || JSON.stringify(defaultCenter);
localStorage.centerZoom = localStorage.centerZoom || defaultZoom;
localStorage.routePlannerMapMode = localStorage.routePlannerMapMode || 0; // default map

document.getElementById("gpxToRouteButton").addEventListener("click", gpxToRoute);
customFileButton.addEventListener("change", handleFileSelect, false);
addPositionButton.onclick = addPositionMapCenter;
removePositionButton.onclick = removePositionButtonFunction;
savePoiButton.onclick = savePoiPopup;

exportRouteButton.onclick = function () {
  document.getElementById("gpxFileName").placeholder = "Rutt_" + new Date().toLocaleDateString().replaceAll(" ", "_") + "_" + trackLength.toFixed(2) + "km";
  document.getElementById("gpxFileNameInput").style.display = "unset";
  document.getElementById("gpxFileName").select();
}

document.getElementById("gpxFileNameInputOk").onclick = function () {
  gpxFileName = encodeURI(document.getElementById("gpxFileName").value.replaceAll(" ", "_") || document.getElementById("gpxFileName").placeholder);
  document.getElementById("gpxFileNameInput").style.display = "none";
  route2gpx();
}

document.getElementById("gpxFileNameInputCancel").onclick = function () {
  document.getElementById("gpxFileNameInput").style.display = "none";
}

document.getElementById("showGPX").addEventListener("change", function () {
  gpxLayer.setVisible(showGPX.checked);
});

document.getElementById("clearMapButton").addEventListener("click", function () {
  trackPointStraight = {};
  trackPointsLayer.getSource().clear();
  poiLayer.getSource().clear();
  trackLineString.setCoordinates([]);
  route.setCoordinates([]);
  gpxLayer.getSource().clear();
  showGPXdiv.style.display = "none";
});

document.getElementById("clickFileButton").onclick = function () {
  customFileButton.click();
}

document.getElementById("helpTextOk").onclick = function () {
  document.getElementById("helpText").style.display = "none";
  document.getElementById("map").style.pointerEvents = "unset";
  document.getElementById("map").style.filter = "unset";
};

document.getElementById("menyButton").onclick = function () {
  buildLinkCode();
  document.getElementById("helpText").style.display = "unset";
  document.getElementById("shareRouteButton").innerHTML = "dela rutt";
};

document.getElementById("navAppButton").onclick = function () {
  window.location.href = buildLinkCode();
};

document.getElementById("shareRouteButton").onclick = async () => {
  if (navigator.share) {
    await navigator.share({
      url: buildLinkCode(),
    });
  } else {
    navigator.clipboard.writeText(buildLinkCode());
    document.getElementById("shareRouteButton").innerHTML = "kopierad!";
  }
}

reverseRoute.onclick = function () {
  trackLineString.setCoordinates(trackLineString.getCoordinates().reverse());
  routeMe();
}

const overlay = new Overlay({
  element: popupContainer,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});

popupCloser.onclick = function () {
  overlay.setPosition(undefined);
  popupCloser.blur();
  return false;
};

savePoiNameButton.onclick = function () {
  const fileName = fileNameInput.value;
  const poiMarker = new Feature({
    routeFeature: true,
    name: fileName,
    geometry: new Point(poiCoordinate),
  });
  poiLayer.getSource().addFeature(poiMarker);
  overlay.setPosition(undefined);
  popupCloser.blur();
  return false;
};

const slitlagerkarta = new TileLayer({
  source: new XYZ({
    url: "https://jole84.se/slitlagerkarta/{z}/{x}/{y}.jpg",
    minZoom: 6,
    maxZoom: 14,
  }),
  maxZoom: 15.5,
  useInterimTilesOnError: false,
});

const slitlagerkarta_nedtonad = new TileLayer({
  source: new XYZ({
    url: "https://jole84.se/slitlagerkarta_nedtonad/{z}/{x}/{y}.jpg",
    minZoom: 6,
    maxZoom: 14,
  }),
  maxZoom: 15.5,
  visible: false,
  useInterimTilesOnError: false,
});

const ortofoto = new TileLayer({
  source: new TileWMS({
    url: "https://minkarta.lantmateriet.se/map/ortofoto/",
    params: {
      layers: "Ortofoto_0.5,Ortofoto_0.4,Ortofoto_0.25,Ortofoto_0.16",
      TILED: true,
    },
  }),
  minZoom: 15.5,
});

const topoweb = new TileLayer({
  source: new XYZ({
    url: "https://minkarta.lantmateriet.se/map/topowebbcache/?layer=topowebb&style=default&tilematrixset=3857&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}",
    maxZoom: 17,
  }),
  visible: false,
});

const osm = new TileLayer({
  className: "saturated",
  source: new OSM(),
  visible: false,
});

const routeStyle = {
  startPoint: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      opacity: 0.85,
      src: "https://jole84.se/start-marker.svg",
    }),
  }),
  midPoint: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      opacity: 0.85,
      src: "https://jole84.se/marker.svg",
    }),
  }),
  endPoint: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      opacity: 0.85,
      src: "https://jole84.se/end-marker.svg",
    }),
  }),
  trackLine: new Style({
    stroke: new Stroke({
      color: [255, 0, 0, 0.6],
      lineDash: [20],
      width: 6,
    }),
  }),
  routeLine: new Style({
    stroke: new Stroke({
      width: 10,
      color: [255, 0, 255, 0.4],
    }),
  }),
};

const gpxStyle = {
  Point: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      opacity: 0.85,
      src: "https://jole84.se/poi-marker-blue.svg",
    }),
    text: new Text({
      font: "14px Roboto,monospace",
      textAlign: "left",
      offsetX: 10,
      fill: new Fill({
        color: "blue",
      }),
      stroke: new Stroke({
        color: "white",
        width: 4,
      }),
    }),
  }),
  LineString: new Style({
    stroke: new Stroke({
      color: [0, 0, 255, 0.4],
      width: 10,
    }),
  }),
  Polygon: new Style({
    stroke: new Stroke({
      color: [255, 0, 0, 1],
      width: 5,
    }),
    fill: new Fill({
      color: [255, 0, 0, 0.2],
    }),
  }),
};
gpxStyle["MultiLineString"] = gpxStyle["LineString"];
gpxStyle["MultiPolygon"] = gpxStyle["Polygon"];
routeStyle["MultiLineString"] = routeStyle["LineString"];

const route = new LineString([]);
const routeLineFeature = new Feature({
  type: "routeLine",
  geometry: route,
});

const routeLineLayer = new VectorLayer({
  source: new VectorSource({
    features: [routeLineFeature],
  }),
  style: function (feature) {
    routeStyle["routePoint"].getText().setText(feature.get("name"));
    return routeStyle[feature.get("type")];
  },
});

const trackLineString = new LineString([]);
const trackLineFeature = new Feature({
  type: "trackLine",
  routeFeature: true,
  geometry: trackLineString,
});

const trackLineLayer = new VectorLayer({
  source: new VectorSource({
    features: [trackLineFeature],
  }),
  style: function (feature) {
    return routeStyle[feature.get("type")];
  },
});

const trackPointsLayer = new VectorLayer({
  source: new VectorSource({
  }),
  style: function (feature) {
    routeStyle["routePoint"].getText().setText(feature.get("name"));
    return routeStyle[feature.get("type")];
  },
});

const poiLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature) {
    return new Style({
      image: new Icon({
        anchor: [0.5, 1],
        opacity: 0.85,
        src: "https://jole84.se/poi-marker.svg",
      }),
      text: new Text({
        text: feature.get("name"),
        font: "14px Roboto,monospace",
        textAlign: "left",
        offsetX: 10,
        fill: new Fill({
          color: "#b41412",
        }),
        stroke: new Stroke({
          color: "white",
          width: 4,
        }),
      }),
    });
  },
});

const gpxLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature) {
    gpxStyle["Point"].getText().setText(feature.get("name"));
    return gpxStyle[feature.getGeometry().getType()];
  },
});

const view = new View({
  center: JSON.parse(localStorage.centerCoordinate),
  zoom: JSON.parse(localStorage.centerZoom),
  minZoom: 3,
  maxZoom: 20,
  enableRotation: false,
});

const modifyTrackLine = new Modify({ source: trackLineLayer.getSource() });
const modifypoi = new Modify({ source: poiLayer.getSource() });

const map = new Map({
  target: "map",
  layers: [
    slitlagerkarta,
    slitlagerkarta_nedtonad,
    ortofoto,
    topoweb,
    osm,
    gpxLayer,
    routeLineLayer,
    trackLineLayer,
    trackPointsLayer,
    poiLayer,
  ],
  view: view,
  keyboardEventTarget: document,
  overlays: [overlay],
});

map.addInteraction(new KeyboardPan({ pixelDelta: 64 }));

modifyTrackLine.on("modifyend", function () {
  routeMe();
});

trackPointsLayer.on("change", function () {
  trackPointsLayer.getSource().forEachFeature(function (feature) {
    trackPointStraight[feature.getId()] = feature.get("straight");
  });
})

trackLineString.addEventListener("change", function () {
  trackPointsLayer.getSource().clear();
  for (let i = 0; i < trackLineString.getCoordinates().length; i++) {
    const marker = new Feature({
      straight: (trackPointStraight[i] || false),
      type: getPointType(i),
      geometry: new Point(trackLineString.getCoordinates()[i]),
    });
    marker.setId(i);
    trackPointsLayer.getSource().addFeature(marker);
  }
});

layerSelector.addEventListener("change", function () {
  localStorage.routePlannerMapMode = layerSelector.value;
  switchMap();
});

function toCoordinateString(coordinate) {
  if (coordinate[1] > 100) {
    coordinate = toLonLat(coordinate);
  }
  return [(Number(coordinate[0].toFixed(5))), Number(coordinate[1].toFixed(5))];
}

function buildLinkCode() {
  const destinationPoints = [];
  const poiPoints = [];

  let linkCode = "https://jole84.se/nav-app/index.html?";

  trackPointsLayer.getSource().forEachFeature(function (feature) {
    destinationPoints[feature.getId()] = toCoordinateString(feature.getGeometry().getCoordinates());
  });

  if (destinationPoints.length > 0) {
    linkCode += "destinationPoints=" + JSON.stringify(destinationPoints);
  }


  if (poiLayer.getSource().getFeatures().length > 0) {
    poiLayer.getSource().forEachFeature(function (feature) {
      poiPoints.push([toCoordinateString(feature.getGeometry().getCoordinates()), feature.get("name")]);
    });
    linkCode += "&poiPoints=" + JSON.stringify(poiPoints);
  }

  document.getElementById("linkCodeDiv").innerHTML = linkCode;
  return linkCode;
}

function switchMap() {
  layerSelector.value = localStorage.routePlannerMapMode;
  slitlagerkarta.setVisible(false);
  slitlagerkarta_nedtonad.setVisible(false);
  ortofoto.setVisible(false);
  topoweb.setVisible(false);
  osm.setVisible(false);
  lowerRightGroup.style.bottom = "5px";

  if (localStorage.routePlannerMapMode == 0) {
    slitlagerkarta.setVisible(true);
    ortofoto.setVisible(true);
    ortofoto.setMinZoom(15.5);
  } else if (localStorage.routePlannerMapMode == 1) {
    slitlagerkarta_nedtonad.setVisible(true);
    ortofoto.setVisible(true);
    ortofoto.setMinZoom(15.5);
  } else if (localStorage.routePlannerMapMode == 2) {
    topoweb.setVisible(true);
  } else if (localStorage.routePlannerMapMode == 3) {
    ortofoto.setVisible(true);
    ortofoto.setMinZoom(1);
    ortofoto.setMaxZoom(20);
  } else if (localStorage.routePlannerMapMode == 4) {
    lowerRightGroup.style.bottom = "25px";
    osm.setVisible(true);
  }
}

function getPixelDistance(pixel, pixel2) {
  return Math.sqrt((pixel[1] - pixel2[1]) * (pixel[1] - pixel2[1]) + (pixel[0] - pixel2[0]) * (pixel[0] - pixel2[0]));
}

function savePoiPopup() {
  // save POI function
  poiCoordinate = map.getView().getCenter();
  fileNameInput.value = toStringXY(
    toLonLat(map.getView().getCenter()).reverse(),
    5,
  ).replace(",", "");
  overlay.setPosition(poiCoordinate);
  fileNameInput.select();
}

function addPositionMapCenter() {
  addPosition(map.getView().getCenter());
}

function removePositionButtonFunction() {
  removePosition(map.getPixelFromCoordinate(view.getCenter()));
}

function addPosition(coordinate) {
  trackLineString.appendCoordinate(coordinate);
  routeMe();
}

function removePosition(pixel) {
  let removedItem = false;
  const closestTrackPoint = trackPointsLayer.getSource().getClosestFeatureToCoordinate(map.getCoordinateFromPixel(pixel), function (feature) { return feature.getGeometry().getType() == "Point" });
  const closestPoi = poiLayer.getSource().getClosestFeatureToCoordinate(map.getCoordinateFromPixel(pixel));

  // remove trackPoint and redraw layer
  if (closestTrackPoint != undefined) {
    if (getPixelDistance(pixel, map.getPixelFromCoordinate(closestTrackPoint.getGeometry().getCoordinates())) < 40) {
      delete trackPointStraight[closestTrackPoint.getId()];
      trackPointsLayer.getSource().removeFeature(closestTrackPoint);
      removedItem = true;
    }
    const trackPoints = [];
    for (let i = 0; i < trackPointsLayer.getSource().getFeatures().length + 1; i++) {
      try {
        trackPoints.push(trackPointsLayer.getSource().getFeatureById(i).getGeometry().getCoordinates());
      } catch {
        console.log(i, " is removed!");
      }
    }
    trackLineString.setCoordinates(trackPoints);
  }

  // remove poi
  if (closestPoi != undefined && !removedItem) {
    if (getPixelDistance(pixel, map.getPixelFromCoordinate(closestPoi.getGeometry().getCoordinates())) < 40) {
      poiLayer.getSource().removeFeature(closestPoi);
      removedItem = true;
    }
  }

  // if only 1 wp, remove route and redraw startpoint
  if (trackPointsLayer.getSource().getFeatures().length == 1) {
    route.setCoordinates([]);
    infoDiv.innerHTML = "";
    info2Div.innerHTML = "";
    info3Div.innerHTML = "";
  }

  routeMe();
  return removedItem;
}

function updateInfo() {
  const centerCoordinate = toLonLat(map.getView().getCenter()).reverse();
  coordsDiv.innerHTML = toStringXY(centerCoordinate, 5);
  const streetviewlink =
    '<a href="http://maps.google.com/maps?q=&layer=c&cbll=' +
    centerCoordinate +
    '" target="_blank">Streetview</a>';
  const gmaplink =
    '<a href="http://maps.google.com/maps?q=' +
    centerCoordinate +
    '" target="_blank">Gmap</a>';
  info4Div.innerHTML = streetviewlink + "<br>" + gmaplink;
}

function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

const allowedTurnType = [2, 4, 5, 7, 13, 14];
function translateVoicehint([geoPart, turnInstruction, roundaboutExit, distanceToNext, turnDeg]) {
  let returnString;
  const nummer = {
    1: "första",
    2: "andra",
    3: "tredje",
    4: "fjärde",
    5: "femte",
  }
  const turnType = {
    1: "Fortsätt (rakt fram)",
    2: "Sväng vänster",
    3: "Sväng svagt åt vänster",
    4: "Sväng skarpt vänster",
    5: "Sväng höger",
    6: "Sväng svagt åt höger",
    7: "Sväng skarpt höger",
    8: "Håll vänster",
    9: "Håll höger",
    10: "U-sväng",
    11: "U-sväng höger",
    12: "Off route",
    13: "I rondellen, tag ",
    14: "I rondellen, tag ",
    15: "180 grader u-sväng",
    16: "Beeline routing",
  }
  returnString = turnType[turnInstruction];
  if (roundaboutExit > 0) {
    returnString += nummer[roundaboutExit] + " utfarten";
  }
  // if (distanceToNext < 1000) {
  //   returnString += ",\nfortsätt i " + Math.round(distanceToNext) + "m"
  // }
  if (distanceToNext > 1000) {
    returnString += ",\nfortsätt i " + Math.round(distanceToNext / 1000) + "km"
  }
  return returnString;
}
routeStyle["routePoint"] = gpxStyle["Point"];

function routeMe() {
  const coordsString = [];
  const straightPoints = [];
  const localStoragetrackPoints = [];

  trackPointsLayer.getSource().forEachFeature(function (feature) {
    coordsString[feature.getId()] = toLonLat(feature.getGeometry().getCoordinates());
    localStoragetrackPoints[feature.getId()] = [
      feature.getGeometry().getCoordinates(),
      feature.get("straight"),
    ]
    if (feature.get("straight")) {
      straightPoints.push(feature.getId());
    }
  });

  localStorage.trackPoints = JSON.stringify(localStoragetrackPoints);

  const brouterUrl =
    "https://brouter.de/brouter" +
    "?lonlats=" +
    coordsString.join("|") +
    "&profile=car-fast&alternativeidx=0&format=geojson" +
    "&straight=" +
    straightPoints.join(",") +
    "&timode=2";

  if (trackPointsLayer.getSource().getFeatures().length >= 2) {
    reverseRoute.style.display = "unset";
    fetch(brouterUrl).then(function (response) {
      response.json().then(function (result) {
        trackLength = result.features[0].properties["track-length"] / 1000; // track-length in km
        const totalTime = result.features[0].properties["total-time"] * 1000; // track-time in milliseconds

        // add route information to info box
        infoDiv.innerHTML = "Avstånd: " + trackLength.toFixed(2) + " km";
        info2Div.innerHTML =
          "Restid: " +
          new Date(0 + totalTime).toUTCString().toString().slice(16, 25);

        route.setCoordinates(new GeoJSON().readFeature(result.features[0], {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857"
        }).getGeometry().getCoordinates());

        const voicehints = result.features[0].properties.voicehints;
        const routeGeometryCoordinates = route.getCoordinates();
        for (var i = 0; i < voicehints.length; i++) {
          if (allowedTurnType.includes(voicehints[i][1])) {
            const marker = new Feature({
              type: "routePoint",
              name: translateVoicehint(voicehints[i]),
              geometry: new Point(routeGeometryCoordinates[voicehints[i][0]]),
            });
            trackPointsLayer.getSource().addFeature(marker);
          }
        }
      });
    });
  } else {
    reverseRoute.style.display = "none";
  }
}

function route2gpx() {
  let routeExist = false;
  let gpxFile = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<gpx version="1.1" creator="jole84 route-planner">
  <metadata>
    <desc>GPX file created by jole84 route-planner</desc>
  </metadata>`;

  // for each poi
  if (poiLayer.getSource().getFeatures().length > 0) {
    routeExist = true;
    for (const element of poiLayer.getSource().getFeatures()) {
      const lonlat = toLonLat(element.getGeometry().getCoordinates());
      const name = element.get("name");
      gpxFile += `
  <wpt lon="${lonlat[0]}" lat="${lonlat[1]}"><name>${name}</name></wpt>`;
    }
  }

  if(trackPointsLayer.getSource().getFeatures().length > 2) {
    for (const element of trackPointsLayer.getSource().getFeatures()) {
      const lonlat = toLonLat(element.getGeometry().getCoordinates());
      let name = element.get("name");
      if (element.getId() == 0) {
        name = "Start";
      } else if (element.getId() == 1) {
        name = "Stop";
      }
      gpxFile += `
  <wpt lon="${lonlat[0]}" lat="${lonlat[1]}"><name>${name}</name></wpt>`;
    }
  }

  if (route.getCoordinates().length > 0) {
    routeExist = true;
    gpxFile += `
  <trk>
    <name>${gpxFileName}</name>
    <trkseg>`;

    // for each trkpt
    route.forEachSegment(function (segment) {
      const lonlat = toLonLat(segment);
      gpxFile += `
      <trkpt lon="${lonlat[0]}" lat="${lonlat[1]}"><ele>${lonlat[2] || 0}</ele></trkpt>`;
    });

    // end of trkseg
    gpxFile += `
    </trkseg>
  </trk>`;
  }

  // write end of file
  gpxFile += `
</gpx>`;

  if (routeExist) {
    const file = new Blob([gpxFile], { type: "application/gpx+xml" });
    console.log(gpxFile, gpxFileName);
    saveAs(file, gpxFileName + ".gpx");
  }
}

function getPointType(i) {
  if (i == 0) {
    return "startPoint";
  } else if (i == trackLineFeature.getGeometry().getCoordinates().length - 1) {
    return "endPoint";
  } else {
    return "midPoint";
  }
}

function getFileFormat(fileExtention) {
  if (fileExtention === "gpx") {
    return new GPX();
  } else if (fileExtention === "kml") {
    return new KML({ extractStyles: false });
  } else if (fileExtention === "geojson") {
    return new GeoJSON();
  }
}

// gpx loader
function handleFileSelect(evt) {
  const files = evt.target.files; // FileList object
  // remove previously loaded gpx files
  gpxLayer.getSource().clear();
  for (let i = 0; i < files.length; i++) {
    const reader = new FileReader();
    reader.readAsText(files[i], "UTF-8");
    reader.onload = function (evt) {
      const fileFormat = getFileFormat(files[0].name.split(".").pop().toLowerCase());
      const gpxFeatures = fileFormat.readFeatures(evt.target.result, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      if (files.length > 1) {
        // set random color if two or more files is loaded
        const color = [
          Math.floor(Math.random() * 255),
          Math.floor(Math.random() * 255),
          Math.floor(Math.random() * 255),
          0.8,
        ];
        gpxFeatures.forEach((f) => {
          f.setStyle(
            new Style({
              stroke: new Stroke({
                color: color,
                width: 10,
              }),
              text: new Text({
                text: f.get("name"),
                placement: "line",
                repeat: 500,
                font: "bold 14px Roboto,monospace",
                fill: new Fill({
                  color: color,
                }),
                stroke: new Stroke({
                  color: "white",
                  width: 4,
                }),
              }),
              image: new Icon({
                anchor: [0.5, 1],
                color: color,
                src: "https://jole84.se/white-marker.svg",
              }),
            }),
          );
        });
      }
      gpxLayer.getSource().addFeatures(gpxFeatures);
    };
  }
}

if ("launchQueue" in window) {
  launchQueue.setConsumer(async (launchParams) => {
    for (const file of launchParams.files) {
      // load file 
      const fileFormat = getFileFormat(file.name.split(".").pop().toLowerCase());
      const f = await file.getFile();
      const content = await f.text();
      const gpxFeatures = fileFormat.readFeatures(content, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      gpxLayer.getSource().addFeatures(gpxFeatures);
    }
  });
}


gpxLayer.getSource().addEventListener("addfeature", function () {
  showGPXdiv.style.display = "inline-block";
  gpxLayer.getSource().once("change", function () {
    showGPX.checked = true;
    gpxLayer.setVisible(true);
    if (gpxLayer.getSource().getState() === "ready") {
      const padding = 100;
      view.fit(gpxLayer.getSource().getExtent(), {
        padding: [padding, padding, padding, padding],
        duration: 500,
        maxZoom: 15,
      });
    }
  });
});

touchFriendlyCheck.addEventListener("change", function () {
  if (touchFriendlyCheck.checked) {
    map.removeInteraction(modifyTrackLine);
    map.removeInteraction(modifypoi);
  } else {
    map.addInteraction(modifyTrackLine);
    map.addInteraction(modifypoi);
  }
});
if (isTouchDevice()) {
  touchFriendlyCheck.checked = true;
} else {
  document.getElementById("touchFriendly").style.display = "none";
  document.getElementById("addRemoveButtons").style.display = "none";
  map.addInteraction(modifyTrackLine);
  map.addInteraction(modifypoi);
}

function gpxToRoute() {
  // convert loaded gpx track to route
  trackPointStraight = {};
  trackLineString.setCoordinates([]);

  gpxLayer.getSource().forEachFeature(function (element) {
    console.log(element.getGeometry().getType())
    if (element.getGeometry().getType() === "LineString") {
      element.getGeometry().simplify(500).getCoordinates().reverse().forEach(function (coordinate) {
        trackLineString.appendCoordinate(coordinate);
      });
      routeMe();
    }
    if (element.getGeometry().getType() === "MultiLineString") {
      element.getGeometry().simplify(500).getCoordinates()[0].forEach(function (coordinate) {
        trackLineString.appendCoordinate(coordinate);
      });
      routeMe();
    }
    if (element.getGeometry().getType() === "Point") {
      const poiMarker = new Feature({
        routeFeature: true,
        name: element.get("name"),
        geometry: new Point(element.getGeometry().getCoordinates()),
      });
      poiLayer.getSource().addFeature(poiMarker);
    }
  });
}

map.on("singleclick", function (event) {
  if (!touchFriendlyCheck.checked) {
    if (event.originalEvent.altKey) {
      // if alt + click add poi
      poiCoordinate = event.coordinate;
      overlay.setPosition(poiCoordinate);
      fileNameInput.value = toStringXY(
        toLonLat(poiCoordinate).reverse(),
        5,
      ).replace(",", "");
      fileNameInput.select();
    } else if (event.originalEvent.ctrlKey) {
      const coordinate = toLonLat(event.coordinate).reverse();
      window.open(
        "http://maps.google.com/maps?q=&layer=c&cbll=" + coordinate,
        "_blank",
      );
    } else {
      // change trackPoint straight value
      const closestTrackPoint = trackPointsLayer.getSource().getClosestFeatureToCoordinate(event.coordinate, function (feature) { return feature.getGeometry().getType() == "Point" });
      if (closestTrackPoint != undefined) {
        if (getPixelDistance(event.pixel, map.getPixelFromCoordinate(closestTrackPoint.getGeometry().getCoordinates())) < 40) {
          closestTrackPoint.set("straight", !closestTrackPoint.get("straight"));
        }
        routeMe();
      }
    }
  }
});

map.on("contextmenu", function (event) {
  event.preventDefault();
  // document.getElementById("helpText").style.display == "none" && !overlay.getPosition() && event.target.getAttribute("id") != "gpxFileName"
  if (!touchFriendlyCheck.checked) {
    if (event.originalEvent.shiftKey) {
      // if shift + click add offroad waypoint
      trackPointStraight[trackLineFeature.getGeometry().getCoordinates().length - 1] = true;
    }
    let removedItem = removePosition(event.pixel);
    if (!removedItem) {
      addPosition(event.coordinate);
    }
  }
});

document.addEventListener("mouseup", function (event) {
  // middle mouse button
  if (event.button == 1) {
    console.log(event);
  }
});

document.addEventListener("keyup", function (event) {
  if (!overlay.getPosition() && document.getElementById("gpxFileNameInput").style.display != "unset") {
    if (event.key == "p") {
      savePoiPopup();
    }
  }
});

document.addEventListener("keydown", function (event) {
  if (document.getElementById("helpText").style.display != "none" && (event.key == "Enter" || event.key == "Escape")) {
    document.getElementById("helpTextOk").click();
  } else if (document.getElementById("gpxFileNameInput").style.display == "unset") {
    if (event.key == "Enter") {
      event.preventDefault();
      document.getElementById("gpxFileNameInputOk").click();
    }
    if (event.key == "Escape") {
      document.getElementById("gpxFileNameInputCancel").click();
    }
  } else if (!overlay.getPosition()) {
    if (event.ctrlKey && event.key == "s") {
      event.preventDefault();
      exportRouteButton.click();
    }
    if (event.key == "a") {
      addPositionMapCenter();
    }
    if (event.key == "Escape" || event.key == "Delete") {
      removePositionButtonFunction();
    }
    if (event.key == "Backspace") {
      removePosition(map.getPixelFromCoordinate(trackLineString.getLastCoordinate()));
    }
    if (event.key == "v") {
      localStorage.routePlannerMapMode++;
      if (localStorage.routePlannerMapMode > 4) {
        localStorage.routePlannerMapMode = 0;
      }
      switchMap();
    }
  }
  if (overlay.getPosition() != undefined) {
    if (event.key == "Enter") {
      event.preventDefault();
      savePoiNameButton.click();
    }
    if (event.key == "Escape") {
      popupCloser.click();
    }
  }
});

view.on("change:center", function () {
  updateInfo();
});

map.on("pointermove", function (evt) {
  const hit = this.forEachFeatureAtPixel(evt.pixel, function (feature) {
    if (feature.get("routeFeature")) {
      return true;
    }
  }, {
    hitTolerance: 5,
  });
  if (hit) {
    this.getTargetElement().style.cursor = "pointer";
  } else {
    this.getTargetElement().style.cursor = "crosshair";
  }
});

function getPlaceName([lon, lat]) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  let textString;

  fetch(url).then((response) => {
    response.json().then((result) => {
      textString = result.address.village || result.address.city || result.address.town || result.display_name;
      info3Div.innerHTML = textString;
    });
  });
  return textString;
}

// save features to localStorage on exit
window.onbeforeunload = function () {
  localStorage.centerCoordinate = JSON.stringify(view.getCenter());
  localStorage.centerZoom = view.getZoom();
}

poiLayer.getSource().addEventListener("change", function () {
  const poiString = [];
  poiLayer.getSource().forEachFeature(function (feature) {
    poiString.push([feature.getGeometry().getCoordinates(), feature.get("name")]);
  });
  localStorage.poiString = JSON.stringify(poiString);
});

// load features from localStorage
JSON.parse(localStorage.trackPoints).forEach(function (element, index) {
  trackPointStraight[index] = element[1];
  trackLineString.appendCoordinate(element[0]);
  if (index == JSON.parse(localStorage.trackPoints).length - 1) {
    routeMe();
  }
});

JSON.parse(localStorage.poiString).forEach(function (element) {
  const coordinate = element[0];
  const fileName = element[1];
  const poiMarker = new Feature({
    routeFeature: true,
    name: fileName,
    geometry: new Point(coordinate),
  });
  poiLayer.getSource().addFeature(poiMarker);
});

// run funtions at page load
buildLinkCode();
updateInfo();
switchMap();
