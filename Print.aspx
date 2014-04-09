<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Print.aspx.cs" Inherits="Wsdot.Alpaca.Print" %>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<!-- Always force latest IE rendering engine (even in intranet) & Chrome Frame -->
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no">
	<title>Title VI</title>
	<link rel="stylesheet" href="http://js.arcgis.com/3.8compact/js/esri/css/esri.css">
	<link rel="stylesheet" href="Style/Print.css" />
	<script type="text/javascript">
		// Setup Google Analytics, but not if user has specified that they don't want to be tracked.
		var _gaq = _gaq || [];
		(function (dnt) {
			if (dnt !== "yes" && dnt !== "1") {
				_gaq.push(['_setAccount', 'UA-970887-21']);
				_gaq.push(['_trackPageview']);

				(function () {
					var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
					ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
					var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
				})();
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
	<script src="http://js.arcgis.com/3.8compact/"></script>
	<script src="Scripts/Print.js"></script>
</body>
</html>

