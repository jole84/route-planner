import "./style.css";
import { Feature, Map, View } from "ol";
import { Modify } from "ol/interaction.js";
import { Stroke, Style, Icon, Fill, Text } from "ol/style.js";
import { toLonLat } from "ol/proj.js";
import { toStringXY } from "ol/coordinate";
import { Vector as VectorLayer } from "ol/layer.js";
import { saveAs } from 'file-saver';
import GeoJSON from "ol/format/GeoJSON.js";
import GPX from "ol/format/GPX.js";
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
const popupCloser = document.getElementById("popup-closer");
const popupContainer = document.getElementById("popup");
var addPositionButton = document.getElementById("addPositionButton");
var centerCoordinate;
var coordsDiv = document.getElementById("coordsDiv");
var fileNameInput = document.getElementById("fileNameInput");
var gpxFeatures;
var gpxFormat = new GPX();
var info2Div = document.getElementById("info2");
var info3Div = document.getElementById("info3");
var info4Div = document.getElementById("info4");
var infoDiv = document.getElementById("info");
var layerSelector = document.getElementById("layerSelector");
var mapMode = 0; // default map
var poiCoordinate;
var removePositionButton = document.getElementById("removePositionButton");
var savePoiButton = document.getElementById("savePoiButton");
var savePoiNameButton = document.getElementById("savePoiNameButton");
var saveRouteButton = document.getElementById("saveRouteButton");
var showGPXdiv = document.getElementById("showGPXdiv");
var touchFriendlyCheck = document.getElementById("touchFriendlyCheck");
var trackLength;
var trackPointStraight = {};

addPositionButton.onclick = addPositionMapCenter;
customFileButton.addEventListener("change", handleFileSelect, false);
removePositionButton.onclick = removePositionButtonFunction;
savePoiButton.onclick = savePoiPopup;
saveRouteButton.onclick = route2gpx;

document.getElementById("showGPX").addEventListener("change", function () {
  gpxLayer.setVisible(showGPX.checked);
});

document.getElementById("clickFileButton").onclick = function () {
  customFileButton.click();
}

document.getElementById("helpTextOk").onclick = function () {
  document.getElementById("helpText").style.display = "none";
  document.getElementById("map").style.pointerEvents = "unset";
  document.getElementById("map").style.filter = "unset";
};

document.getElementById("help").onclick = function () {
  document.getElementById("helpText").style.display = "unset";
};

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
  const coordinate = toLonLat(poiCoordinate);
  var fileName = fileNameInput.value;
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

var slitlagerkarta = new TileLayer({
  source: new XYZ({
    url: "https://jole84.se/slitlagerkarta/{z}/{x}/{y}.jpg",
    minZoom: 6,
    maxZoom: 14,
  }),
  maxZoom: 15.5,
  useInterimTilesOnError: false,
});

var slitlagerkarta_nedtonad = new TileLayer({
  source: new XYZ({
    url: "https://jole84.se/slitlagerkarta_nedtonad/{z}/{x}/{y}.jpg",
    minZoom: 6,
    maxZoom: 14,
  }),
  maxZoom: 15.5,
  visible: false,
  useInterimTilesOnError: false,
});

var ortofoto = new TileLayer({
  source: new TileWMS({
    url: "https://minkarta.lantmateriet.se/map/ortofoto/",
    params: {
      layers: "Ortofoto_0.5,Ortofoto_0.4,Ortofoto_0.25,Ortofoto_0.16",
      TILED: true,
    },
  }),
  minZoom: 15.5,
});

var topoweb = new TileLayer({
  source: new XYZ({
    url: "https://minkarta.lantmateriet.se/map/topowebbcache/?layer=topowebb&style=default&tilematrixset=3857&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}",
    maxZoom: 17,
  }),
  visible: false,
});

var osm = new TileLayer({
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
routeStyle["MultiLineString"] = routeStyle["LineString"];

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
};
gpxStyle["MultiLineString"] = gpxStyle["LineString"];

var trackLineString = new LineString([]);
var trackLineFeature = new Feature({
  type: "trackLine",
  routeFeature: true,
  geometry: trackLineString,
});

var routeLineLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature) {
    return routeStyle[feature.get("type")];
  },
});

var trackLineLayer = new VectorLayer({
  source: new VectorSource({
    features: [trackLineFeature],
  }),
  style: function (feature) {
    return routeStyle[feature.get("type")];
  },
});

var trackPointsLayer = new VectorLayer({
  source: new VectorSource({
    // features: [trackLineFeature],
  }),
  style: function (feature) {
    return routeStyle[feature.get("type")];
  },
});

var poiLayer = new VectorLayer({
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

var gpxLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature) {
    gpxStyle["Point"].getText().setText(feature.get("name"));
    return gpxStyle[feature.getGeometry().getType()];
  },
});

const view = new View({
  center: [1579748.5038203455, 7924318.181076467],
  zoom: 10,
  minZoom: 3,
  maxZoom: 20,
  enableRotation: false,
});

const keyboardPan = new KeyboardPan({ pixelDelta: 64 });
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

map.addInteraction(keyboardPan);

modifyTrackLine.on("modifyend", function () {
  routeMe();
});

trackLineString.addEventListener("change", function () {
  trackPointsLayer.getSource().clear();

  trackLineString.getCoordinates().forEach(function (coordinate) {
    const marker = new Feature({
      // routeFeature: true,
      // name: trackPointsLayer.getSource().getFeatures().length,
      straight: (trackPointStraight[trackPointsLayer.getSource().getFeatures().length] || false),
      type: getPointType(trackPointsLayer.getSource().getFeatures().length),
      geometry: new Point(coordinate),
    });
    marker.setId(trackPointsLayer.getSource().getFeatures().length);
    trackPointsLayer.getSource().addFeature(marker);
  })
})

layerSelector.addEventListener("change", function () {
  mapMode = layerSelector.value;
  switchMap();
});

function switchMap() {
  layerSelector.value = mapMode;
  slitlagerkarta.setVisible(false);
  slitlagerkarta_nedtonad.setVisible(false);
  ortofoto.setVisible(false);
  topoweb.setVisible(false);
  osm.setVisible(false);

  if (mapMode == 0) {
    slitlagerkarta.setVisible(true);
    ortofoto.setVisible(true);
    ortofoto.setMinZoom(15.5);
  } else if (mapMode == 1) {
    slitlagerkarta_nedtonad.setVisible(true);
    ortofoto.setVisible(true);
    ortofoto.setMinZoom(15.5);
  } else if (mapMode == 2) {
    topoweb.setVisible(true);
  } else if (mapMode == 3) {
    ortofoto.setVisible(true);
    ortofoto.setMinZoom(1);
    ortofoto.setMaxZoom(20);
  } else if (mapMode == 4) {
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
  fileNameInput.focus();
}

function addPositionMapCenter() {
  addPosition(map.getView().getCenter());
}

function removePositionButtonFunction() {
  removePosition(map.getPixelFromCoordinate(view.getCenter()));
}

function addPosition(coordinate) {
  trackLineString.appendCoordinate(coordinate);

  // const marker = new Feature({
  //   routeFeature: true,
  //   name: trackPointsLayer.getSource().getFeatures().length,
  //   straight: false,
  //   type: getPointType(trackPointsLayer.getSource().getFeatures().length),
  //   geometry: new Point(coordinate),
  // });
  // marker.setId(trackPointsLayer.getSource().getFeatures().length);
  // trackPointsLayer.getSource().addFeature(marker);

  routeMe();
}

function removePosition(pixel) {
  var closestTrackPoint = trackPointsLayer.getSource().getClosestFeatureToCoordinate(map.getCoordinateFromPixel(pixel), function (feature) { return feature.getGeometry().getType() == "Point" });
  var closestPoi = poiLayer.getSource().getClosestFeatureToCoordinate(map.getCoordinateFromPixel(pixel));

  // remove trackPoint and redraw layer
  if (closestTrackPoint != undefined) {
    if (getPixelDistance(pixel, map.getPixelFromCoordinate(closestTrackPoint.getGeometry().getCoordinates())) < 40) {
      trackPointsLayer.getSource().removeFeature(closestTrackPoint);
    }
    var trackPoints = [];
    for (var i = 0; i < trackPointsLayer.getSource().getFeatures().length + 1; i++) {
      try {
        trackPoints.push(trackPointsLayer.getSource().getFeatureById(i).getGeometry().getCoordinates());
      } catch {
        console.log(i, " is removed!");
      }
    }
    trackLineString.setCoordinates(trackPoints);
  }

  // remove poi
  if (closestPoi != undefined) {
    if (getPixelDistance(pixel, map.getPixelFromCoordinate(closestPoi.getGeometry().getCoordinates())) < 40) {
      poiLayer.getSource().removeFeature(closestPoi);
    }
  }

  // if only 1 wp, remove route and redraw startpoint
  if (trackPointsLayer.getSource().getFeatures().length == 1) {
    routeLineLayer.getSource().clear();
    infoDiv.innerHTML = "";
    info2Div.innerHTML = "";
    info3Div.innerHTML = "";
  }

  routeMe();
}

function updateInfo() {
  centerCoordinate = toLonLat(map.getView().getCenter()).reverse();
  coordsDiv.innerHTML = toStringXY(centerCoordinate, 5);
  var streetviewlink =
    '<a href="http://maps.google.com/maps?q=&layer=c&cbll=' +
    centerCoordinate +
    '" target="_blank">Streetview</a>';
  var gmaplink =
    '<a href="http://maps.google.com/maps?q=' +
    centerCoordinate +
    '" target="_blank">Gmap</a>';
  info4Div.innerHTML = streetviewlink + "<br>" + gmaplink;
}
updateInfo();

function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

function routeMe() {
  var coordsString = [];
  var straightPoints = [];
  trackLineFeature.getGeometry().getCoordinates().forEach(function (coordinate) {
    coordsString.push(toLonLat(coordinate));
  });

  trackPointsLayer.getSource().forEachFeature(function (feature) {
    if (feature.get("straight")) {
      straightPoints.push(feature.getId());
    }
  });

  var brouterUrl =
    "https://brouter.de/brouter" +
    "?lonlats=" +
    coordsString.join("|") +
    "&profile=car-fast&alternativeidx=0&format=geojson" +
    "&straight=" +
    straightPoints.join(",");

  if (trackPointsLayer.getSource().getFeatures().length >= 2) {
    fetch(brouterUrl).then(function (response) {
      response.json().then(function (result) {
        const route = new GeoJSON()
          .readFeature(result.features[0], {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          })
          .getGeometry();

        trackLength = result.features[0].properties["track-length"] / 1000; // track-length in km
        const totalTime = result.features[0].properties["total-time"] * 1000; // track-time in milliseconds

        // add route information to info box
        infoDiv.innerHTML = "Avstånd: " + trackLength.toFixed(2) + " km";
        info2Div.innerHTML =
          "Restid: " +
          new Date(0 + totalTime).toUTCString().toString().slice(16, 25);

        const routeGeometry = new Feature({
          type: "routeLine",
          geometry: route,
        });

        // remove previus route
        routeLineLayer.getSource().clear();

        // finally add route to map
        routeLineLayer.getSource().addFeature(routeGeometry);
      });
    });
  } else {
    routeLineLayer.getSource().clear();
  }
}

function route2gpx() {
  var poiString = [];
  var coordsString = [];
  var straightPoints = [];
  trackLineFeature.getGeometry().getCoordinates().forEach(function (coordinate) {
    coordsString.push(toLonLat(coordinate));
  });

  trackPointsLayer.getSource().forEachFeature(function (feature) {
    if (feature.get("straight")) {
      straightPoints.push(feature.getId());
    }
  });

  poiLayer.getSource().forEachFeature(function (feature) {
    poiString.push([toLonLat(feature.getGeometry().getCoordinates()), feature.get("name")]);
  });

  if (trackPointsLayer.getSource().getFeatures().length >= 2) {
    var brouterUrl =
      "https://brouter.de/brouter?lonlats=" +
      coordsString.join("|") +
      "&profile=car-fast&alternativeidx=0&format=gpx&trackname=Rutt_" +
      new Date().toLocaleDateString() +
      "_" +
      trackLength.toFixed(2) +
      "km" +
      "&straight=" +
      straightPoints.join(",");

    if (poiString.length >= 1) {
      brouterUrl += "&pois=" + poiString.join("|");
    }
    window.location = brouterUrl;
  } else if (poiString.length >= 1) {
    // simple gpx file if no route is created
    let gpxFile = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<gpx version="1.1" creator="jole84 webapp">
<metadata>
  <desc>GPX log created by jole84 webapp</desc>
</metadata>`;

    for (var i = 0; i < poiString.length; i++) {
      gpxFile += `
  <wpt lat="${poiString[i][0][1]}" lon="${poiString[i][0][0]}"><name>${poiString[i][1]}</name></wpt>`;
    }

    gpxFile += `
</gpx>`;
    var file = new Blob([gpxFile], { type: "application/gpx+xml" });
    var filename = "Rutt_" + new Date().toLocaleString().replace(" ", "_") + ".gpx";
    console.log(gpxFile, filename);
    saveAs(file, filename);
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

// gpx loader
function handleFileSelect(evt) {
  showGPXdiv.style.display = "inline-block";
  var files = evt.target.files; // FileList object
  // remove previously loaded gpx files
  gpxLayer.getSource().clear();
  for (var i = 0; i < files.length; i++) {
    var reader = new FileReader();
    reader.readAsText(files[i], "UTF-8");
    reader.onload = function (evt) {
      gpxFeatures = gpxFormat.readFeatures(evt.target.result, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      if (files.length > 1) {
        // set random color if two or more files is loaded
        var color = [
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
  gpxLayer.getSource().once("change", function () {
    showGPX.checked = true;
    gpxLayer.setVisible(true);
    if (gpxLayer.getSource().getState() === "ready") {
      var padding = 100;
      view.fit(gpxLayer.getSource().getExtent(), {
        padding: [padding, padding, padding, padding],
        duration: 500,
      });
    }
  });
}

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
  document.getElementById("addPositionButton").style.display = "none";
  document.getElementById("removePositionButton").style.display = "none";
  map.addInteraction(modifyTrackLine);
  map.addInteraction(modifypoi);
}

modifypoi.addEventListener("modifyend", function () {
  console.log(poiLayer.getSource().getFeatures())
});

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
    } else if (event.originalEvent.ctrlKey) {
      var coordinate = toLonLat(event.coordinate).reverse();
      window.open(
        "http://maps.google.com/maps?q=&layer=c&cbll=" + coordinate,
        "_blank",
      );
    } else {
      if (event.originalEvent.shiftKey) {
        // if shift + click add offroad waypoint
        trackPointStraight[trackLineFeature.getGeometry().getCoordinates().length] = true;
      }
      addPosition(event.coordinate);
    }
  }
});

map.on("contextmenu", function (event) {
  // change trackPoint straight value
  var closestTrackPoint = trackPointsLayer.getSource().getClosestFeatureToCoordinate(map.getCoordinateFromPixel(event.pixel), function (feature) { return feature.getGeometry().getType() == "Point" });
  if (closestTrackPoint != undefined) {
    if (getPixelDistance(event.pixel, map.getPixelFromCoordinate(closestTrackPoint.getGeometry().getCoordinates())) < 40) {
      closestTrackPoint.set("straight", !closestTrackPoint.get("straight"));
    }
  }
  trackPointsLayer.getSource().forEachFeature(function (feature) {
    trackPointStraight[feature.getId()] = feature.get("straight");
  });
  routeMe();
});

document.addEventListener("mouseup", function (event) {
  if (event.button == 1) {
    // middle mouse button
    var eventPixel = [event.clientX, event.clientY];
    removePosition(eventPixel);
    routeMe();
  }
});

document.addEventListener("keyup", function (event) {
  if (!overlay.getPosition()) {
    if (event.key == "p") {
      savePoiPopup();
    }
  }
});

document.addEventListener("keydown", function (event) {
  if (!overlay.getPosition()) {
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
      mapMode++;
      if (mapMode > 4) {
        mapMode = 0;
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
  var hit = this.forEachFeatureAtPixel(evt.pixel, function (feature) {
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
  let url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  var textString;

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
  var trackPoints = [];
  var poiString = [];

  trackPointsLayer.getSource().forEachFeature(function (feature) {
    trackPoints.push([feature.getGeometry().getCoordinates(), feature.get("straight")]);
  });

  poiLayer.getSource().forEachFeature(function (feature) {
    poiString.push([feature.getGeometry().getCoordinates(), feature.get("name")]);
  });

  localStorage.trackPoints = JSON.stringify(trackPoints);
  localStorage.poiString = JSON.stringify(poiString);
}

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
  var fileName = element[1];
  const poiMarker = new Feature({
    routeFeature: true,
    name: fileName,
    geometry: new Point(coordinate),
  });
  poiLayer.getSource().addFeature(poiMarker);
});

document.getElementById("clearMapButton").addEventListener("click", function () {
  trackPointStraight = {};
  trackPointsLayer.getSource().clear();
  poiLayer.getSource().clear();
  trackLineString.setCoordinates([]);
  routeLineLayer.getSource().clear();
  gpxLayer.getSource().clear();
  showGPXdiv.style.display = "none";
});