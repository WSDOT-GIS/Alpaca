<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Print.aspx.cs" Inherits="Wsdot.Alpaca.Print" %>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<!-- Always force latest IE rendering engine (even in intranet) & Chrome Frame -->
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no">
	<title>Title VI</title>
	<link rel="stylesheet" href="http://js.arcgis.com/3.12compact/esri/css/esri.css">
	<link rel="stylesheet" href="Style/Print.css" />
	<script type="text/javascript">
		// Setup Google Analytics, but not if user has specified that they don't want to be tracked.
		(function (dnt) {
			if (dnt !== "yes" && dnt !== "1") {
				(function (i, s, o, g, r, a, m) {
					i['GoogleAnalyticsObject'] = r; i[r] = i[r] || function () {
						(i[r].q = i[r].q || []).push(arguments)
					}, i[r].l = 1 * new Date(); a = s.createElement(o),
					m = s.getElementsByTagName(o)[0]; a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
				})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

				ga('create', {
					trackingId: 'UA-970887-21',
					cookieDomain: "www.wsdot.wa.gov"
				});
				ga(function (tracker) {
					tracker.set("appName", "ALPACA");
					tracker.send('pageview');
					// Set a global variable containing the Google Analytics tracker.
					window.gaTracker = tracker;
				});
			}
		}(navigator.doNotTrack || navigator.msDoNotTrack || null));

	</script>
	<meta name="description" content="Printer friendly version of the page." />
</head>
<body>
	<div id="map"></div>
	<div id="data" 
		data-chart='<%= this.Request.Params["chartdata"] %>' 
		data-extent='<%= this.Request.Params["extent"] %>'
		data-sa-graphics='<%= this.Request.Params["sagraphics"] %>'
		data-sa-renderer='<%= this.Request.Params["sarenderer"] %>'
		data-aoi-graphics='<%= this.Request.Params["aoigraphics"] %>'
		data-aoi-renderer='<%= this.Request.Params["aoirenderer"] %>'
		data-census-layer='<%= this.Request.Params["censuslayer"] %>'>
	</div>
	<script>
		(function () {
			"use strict";
			var url, re = /\/[^\/]+$/;

			url = re.test(location.href) ? location.href.replace(re, "/") : location.href;

			var dojoConfig = {
				async: true,
				parseOnLoad: true,
				paths: {
					"alpaca": url + "Scripts/wsdot/alpaca"
				}
			};

			window.dojoConfig = dojoConfig;
		}());
	</script>
	<script src="http://js.arcgis.com/3.12compact/"></script>
	<script src="Scripts/Print.js"></script>
</body>
</html>

