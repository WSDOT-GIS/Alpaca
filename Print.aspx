<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Print.aspx.cs" Inherits="TitleVI.Print" %>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no">
	<title>Title VI</title>
	<link rel="stylesheet" href="http://js.arcgis.com/3.6compact/js/esri/css/esri.css">
	<link rel="stylesheet" href="Style/Print.css" />
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
					"title6": url + "Scripts/wsdot/title6"
				}
			};

			window.dojoConfig = dojoConfig;
		}());
	</script>
	<script src="http://js.arcgis.com/3.6compact/"></script>
	<script src="Scripts/Print.js"></script>
</body>
</html>

