require(["dojo/ready", "esri/map", "dojo/parser", "dijit/layout/ContentPane", "dijit/layout/BorderContainer"], function (ready, Map) {
	ready(function () {
		var map;

		map = new Map("map", {
			basemap: "hybrid",
			center: [-120.80566406246835, 47.41322033015946],
			zoom: 7,
			showAttribution: true
		});
	});
});