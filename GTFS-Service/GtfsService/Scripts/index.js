/*global L,Gtfs*/
(function () {
	"use strict";

	var map = L.map('map').setView([47.41322033015946, -120.80566406246835], 7);

	L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
		maxZoom: 18
	}).addTo(map);

	/** @typedef {AgencyData}
	 * @property {string} name
	 * @property {string} dataexchange_id
	 */

	var agenciesRequest = new XMLHttpRequest();
	agenciesRequest.addEventListener("load", function () {
		var data, select, frag;
		if (this.status === 200) {
			data = this.response.data;
			// Create the document fragment that the options will be added to.
			frag = document.createDocumentFragment();
			// Create an option for each agency in WA and add to document fragment.
			data.forEach(function (agency) {
				var option;
				if (agency.state === "Washington") {
					option = document.createElement("option");
					option.value = agency.dataexchange_id;
					option.textContent = agency.name;
					frag.appendChild(option);
				}
			});
			select = document.getElementById("agencySelect");
			select.appendChild(frag);
			select.disabled = false;
		} else {
			console.error(this);
		}
	});
	agenciesRequest.responseType = "json";
	agenciesRequest.open("GET", "/api/agencies");
	agenciesRequest.send();

	document.getElementById("agencySelect").addEventListener("change", function (e) {
		var select = e.target;
		console.log(select.value);
		document.getElementById("agencySubmit").disabled = false;
	});

	// Setup agency submission.
	document.forms.agencyForm.onsubmit = function () {
		var progress, request;

		/** Updates the progress meter. 
		 * Shows the progress meter if it is hidden.
		 * @param {XMLHttpRequestProgressEvent} e
		 * @this {XMLHttpRequest}
		 */
		function updateProgress(e) {
			if (progress.hidden) {
				progress.hidden = false;
			}
			if (e.lengthComputable) {
				progress.max = 1;
				progress.value = e.position / e.total;
			} else {
				progress.max = 1;
				progress.value = 0;
			}
		}

		/** Processes the GTFS data.
		 * @param {XMLHttpRequestProgressEvent} e
		 * @this {XMLHttpRequest}
		 */
		function handleResponse(e) {
			var gtfs;
			progress.hidden = true;
			if (e.target.status === 500) {
				alert("A server error occured when attempting to retrieve GTFS data.");
			} else {
				gtfs = e.target.response;
				// Add GeoJSON layers for Stops and Shapes.
				if (gtfs) {
					gtfs = new Gtfs(gtfs);
					console.log("gtfs", gtfs);
					if (gtfs.Stops) {
						L.geoJson(gtfs.Stops, {
							onEachFeature: function (feature, layer) {
								layer.bindPopup(feature.properties.stop_name);
							}
						}).addTo(map);
					}
					if (gtfs.Shapes) {
						L.geoJson(gtfs.Shapes).addTo(map);
					}
				}
			}

		}

		progress = document.getElementById("agencyProgress");

		// Create the HTTP request for the selected agency's GTFS data.
		request = new XMLHttpRequest();
		request.responseType = "json";
		request.addEventListener("loadstart", updateProgress);
		request.addEventListener("progress", updateProgress);
		request.addEventListener("loadend", handleResponse);
		request.open("GET", ["api/feed/", document.getElementById("agencySelect").value].join(""));
		request.send();

		// Returning false so the form does not actually get submitted (prevents page from reloading).
		return false;
	};
}());