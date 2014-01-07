<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Print.aspx.cs" Inherits="Wsdot.Alpaca.Print" %>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no">
	<title>Title VI</title>
	<link rel="stylesheet" href="http://js.arcgis.com/3.6compact/js/esri/css/esri.css">
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
</head>
<body>
	<div id="map"></div>
	<div id="data" 
		data-chart='<%= this.Request.Params["chartdata"] %>' 
		data-graphics='<%= this.Request.Params["graphics"] %>'
		data-extent='<%= this.Request.Params["extent"] %>'
		data-renderer='<%= this.Request.Params["renderer"] %>'>

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
	<script src="http://js.arcgis.com/3.6compact/"></script>
	<script src="Scripts/Print.js"></script>
</body>
</html>

