require([
	"dojo/ready",
	"dijit/registry",
	"esri/map",
	"esri/dijit/BasemapGallery",
	"dijit/form/DropDownButton",
	"dijit/TooltipDialog",
	"dojo/parser",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer"
], function (ready, registry, Map, BasemapGallery) {
	ready(function () {
		var map;

		map = new Map("map", {
			basemap: "hybrid",
			center: [-120.80566406246835, 47.41322033015946],
			zoom: 7,
			showAttribution: true
		});

		map.on("load", function () {
		});
	});
});