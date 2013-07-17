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
], function (ready, registry, Map, BasemapGallery, DropDownButton, TooltipDialog) {
	ready(function () {
		var map;

		map = new Map("map", {
			basemap: "hybrid",
			center: [-120.80566406246835, 47.41322033015946],
			zoom: 7,
			showAttribution: true
		});

		map.on("load", function () {
			var basemapButton, basemapDialog;
			
			basemapButton = document.createElement("div");
			basemapButton.id = "basemapButton";

			map.root.appendChild(basemapButton);

			basemapDialog = new TooltipDialog({
				content: '<div id="basemapGallery"></div>'
			});

			basemapButton = new DropDownButton({
				label: "Basemap",
				name: "basemap",
				dropDown: basemapDialog
			}, basemapButton);

		});
	});
});