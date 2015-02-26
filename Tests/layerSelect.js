/*global require*/
require([
	"queryUtils",
	"layerSelect",
	"esri/config",
	"esri/layers/FeatureLayer",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/ArcGISTiledMapServiceLayer"
], function (queryUtils, layerSelect, esriConfig, FeatureLayer, ArcGISDynamicMapServiceLayer, ArcGISTiledMapServiceLayer) {

	esriConfig.defaults.io.proxyUrl = "../proxy.ashx";

	// Add the PTBA layer
	var rtaLayer = new FeatureLayer("http://webgis.dor.wa.gov/ArcGIS/rest/services/Programs/WADOR_SalesTax/MapServer/1", {
		id: "Regional Transportation Authority (RTA)",
		outFields: ["*"],
		visible: false,
		styling: false,
		surfaceType: "SVG"
	});

	// Add the PTBA layer
	var pdbaLayer = new FeatureLayer("http://webgis.dor.wa.gov/ArcGIS/rest/services/Programs/WADOR_SalesTax/MapServer/2", {
		id: "Public Transportation Benefit Areas (PTBA)",
		outFields: ["PTBA_NAME"],
		visible: false,
		styling: false,
		surfaceType: "SVG"
	});

	var cityLimitsLayer = new ArcGISTiledMapServiceLayer("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/CityLimits/MapServer", {
		id: "City Limits",
		visible: false,
		opacity: 0.6
	});

	var mpoLayer = new ArcGISDynamicMapServiceLayer("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/MetroPlanningOrganization/MapServer", {
		id: "Metro Planning Organization (MPO)",
		visible: false,
		opacity: 0.6

	});

	var rtpoLayer = new ArcGISDynamicMapServiceLayer("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/RegionalTransportationPlanning/MapServer", {
		id: "Regional Transportation Planning Organization (RTPO)",
		visible: false,
		opacity: 0.6
	});

	var tribalLayer = new ArcGISDynamicMapServiceLayer("http://www.wsdot.wa.gov/geosvcs/ArcGIS/rest/services/Shared/TribalReservationLands/MapServer", {
		id: "Reservation and Trust Lands",
		visible: false,
		opacity: 0.6
	});

	var form = document.forms[0];

	[rtaLayer, pdbaLayer, cityLimitsLayer, mpoLayer, rtpoLayer, tribalLayer].forEach(function (layer) {
		var selectElement, option;
		selectElement = document.createElement("select");
		selectElement.disabled = true;
		selectElement.dataset.layerId = layer.id;
		option = document.createElement("option");
		option.textContent = layer.id;
		option.disabled = true;
		selectElement.appendChild(option);
		form.appendChild(selectElement);
		var ls = new layerSelect(selectElement, layer);
		ls.on("featuresloaded", function (result) {
			selectElement.disabled = false;
			selectElement.addEventListener("change", function () {
				var feature = ls.getSelectedFeature();
				console.log("feature", feature);
			});
		}, function (error) {
			console.error("error loading features for " + layer.id, error);
		});
	});
});