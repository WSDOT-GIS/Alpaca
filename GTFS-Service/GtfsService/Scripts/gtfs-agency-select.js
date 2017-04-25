/*global define*/
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	} else {
		// Browser globals
		root.GtfsAgencySelect = factory();
	}
}(this, function () {

	/** Creates a GtfsAgencySelect.
	 * @param {(HTMLSelectElement|string)} selectElement - An existing select element or its "id" attribute.
	 * @constructor
	 * @property {HTMLSelectElement} select - The select element.
	 */
	function createGtfsAgencySelect(selectElement) {

		var select, progressMeter, importButton;

		/**
		 * Sets the visibility of the progress meter
		 * @param {Boolean} visible
		 */
		function setProgressMeterVisibility(visible) {
			if (visible) {
				// Setting the "style.visibility" property is for browsers that don't properly support the hidden property (e.g., IE 10).
				progressMeter.style.visibility = "";
				progressMeter.hidden = false;
			} else {
				progressMeter.style.visibility = "hidden";
				progressMeter.hidden = true;
			}
		}

		/** 
		 * Populates the list of agencies.
		 */
		function populateAgenciesSelect(/*{XMLHttpRequestProgressEvent}*/ e) {
			var data, officialFrag, unofficialFrag, unofficialGroup, officialGroup;

			setProgressMeterVisibility(false);

			data = e.target.response.data || JSON.parse(e.target.response).data;

			if (data) {
				// Get the array of agencies.
				// Filter the array so that only those in WA remain.
				data = data.filter(function (v) {
					return v.state === "Washington";
				});
				// Add each agency to the select box.
				officialFrag = document.createDocumentFragment();
				unofficialFrag = document.createDocumentFragment();
				data.forEach(function (v) {
					var option = document.createElement("option");
					option.textContent = v.name;
					option.value = v.dataexchange_id;
					if (!v.is_official) {
						unofficialFrag.appendChild(option);
					} else {
						officialFrag.appendChild(option);
					}
				});

				unofficialGroup = select.querySelector("optgroup[label=Unofficial]");
				officialGroup = select.querySelector("optgroup[label=Official]");
				officialGroup.appendChild(officialFrag);
				unofficialGroup.appendChild(unofficialFrag);
				select.disabled = false;
			}
		}

		/** Updates the progress of the progress meter based 
		 * on the progress of the currently running HTTP request.
		 * @param {ProgressEvent} e
		 * @this {XMLHttpRequest}
		 */
		function updateProgressMeter(e) {
			var request = e.target;
			if (request.readyState === 3) { // LOADING
				if (e.lengthComputable) {
					progressMeter.max = e.total;
					progressMeter.value = e.loaded;
				}
			} else if (request.readyState === 4) { // DONE
				progressMeter.removeAttribute("value");
				progressMeter.removeAttribute("max");
				setProgressMeterVisibility(false);
				select.hidden = false;
			} else {
				setProgressMeterVisibility(true);
				if (!select.hidden) {
					select.hidden = true;
				}
			}
		}

		/**
		 * @param {string} [agenciesUrl="api/agencies"]
		 */
		function loadAgencyData(agenciesUrl) {
			var agenciesRequest;
			// Set default value for URL if none was provided.
			if (!agenciesUrl) {
				agenciesUrl = "api/agencies";
			}

			// Load agency data
			agenciesRequest = new XMLHttpRequest();
			agenciesRequest.open("GET", agenciesUrl);
			agenciesRequest.responseType = "json";
			agenciesRequest.addEventListener("progress", updateProgressMeter);
			agenciesRequest.addEventListener("loadend", populateAgenciesSelect);
			agenciesRequest.send();
		}

		/** Gets the GTFS data for the currently selected agency.
		*/
		function getGtfsData() {
			var agencyId, url, feedRequest;

			/** Handles the response from a query for GTFS data.
			 * @event {CustomEvent} - Custom event will always have a "request" property of type XMLHttpRequest. "gtfsreturned" events will have a "gtfs" property with GTFS data. "gtfserror" events will have an "error" property with an error message.
			 */
			function handleFeedData(/*{XMLHttpRequestProgressEvent}*/ e) {
				var gtfs, event;
				if (e.target.status === 200) {
					try {

						// Process the GTFS data if available.
						gtfs = e.target.response;
						if (typeof gtfs === "string") {
							gtfs = JSON.parse(gtfs);
						}
						////gtfs = new Gtfs(gtfs);
						if (gtfs) {
							try {
								event = new CustomEvent("gtfsreturned", {
									detail: {
										agencyId: agencyId,
										gtfs: gtfs,
										request: e.target
									}
								});
							} catch (err) {
								console.error("error creating CustomEvent", err);
							}
							// Disable the option in the select for this agency so that its data can't be added a second time.
							document.querySelector("option[value=" + agencyId + "]").disabled = true;
							// Reset the select to the first element, "Select an agency...".
							select.selectedIndex = 0;
							importButton.disabled = true;

							////layers = createLayersFromGtfs(gtfs, agencyId);
						} else {
							try {
								event = new CustomEvent("gtfserror", {
									detail: {
										agencyId: agencyId,
										error: 'Server returned "OK" status, but no GTFS data.',
										request: e.target
									}
								});
							} catch (err) {
								console.error("error creating CustomEvent", err);
							}
						}
					} catch (err) {
						// "Not enough storage is available to complete this operation."
						if (/Not enough storage is available to complete this operation./i.test(err.description)) {
							alert("This browser cannot handle GTFS requests this large.\nPlease try a different web browser (e.g., Firefox or Chrome).");
						} else {
							throw err;
						}
					}
				} else {
					try {
						event = new CustomEvent("gtfserror", {
							detail: {
								agencyId: agencyId,
								error: "Error loading GTFS data",
								request: e.target
							}
						});
					} catch (err) {
						console.error("error creating custom event", err);
					}
				}
				if (event) {
					select.dispatchEvent(event);
				}
			}

			agencyId = select.value;
			url = "api/feed/" + agencyId;

			feedRequest = new XMLHttpRequest();
			feedRequest.addEventListener("loadstart", updateProgressMeter);
			feedRequest.addEventListener("progress", updateProgressMeter);
			feedRequest.addEventListener("loadend", handleFeedData);
			feedRequest.addEventListener("loadend", updateProgressMeter);
			feedRequest.open("GET", url);
			feedRequest.setRequestHeader("Accept", "application/json,text/json");
			feedRequest.responseType = "json";
			feedRequest.send();
		}

		// Store the select element in a variable.
		if (selectElement instanceof HTMLSelectElement) {
			select = selectElement;
		} else if (typeof selectElement === "string") {
			select = document.getElementById(selectElement);
		}
		// Throw an error if no valid select element was specified.
		if (!select) {
			throw new TypeError("The selectElement must be either an HTMLSelectElement or its \"id\".");
		}

		select.disabled = true;

		// Add classes and option groups to select.
		var frag = document.createDocumentFragment();
		var option = document.createElement("option");
		option.disabled = true;
		option.textContent = "Select an agency...";
		frag.appendChild(option);
		select.classList.add("gtfs-agency-select");
		var officialGroup = document.createElement("optgroup");
		officialGroup.label = "Official";
		var unofficialGroup = document.createElement("optgroup");
		unofficialGroup.label = "Unofficial";
		frag.appendChild(officialGroup);
		frag.appendChild(unofficialGroup);
		select.appendChild(frag);

		// Create the progress meter.
		progressMeter = document.createElement("progress");
		progressMeter.textContent = "Loading GTFS data...";
		// Add the progress meter after the select element.
		select.parentElement.appendChild(progressMeter);
		setProgressMeterVisibility(false);

		this.select = select;

		importButton = document.createElement("button");
		importButton.textContent = "Import";
		importButton.title = "Import GTFS data for the selected agency";
		importButton.disabled = true;
		select.parentElement.appendChild(importButton);

		select.addEventListener("change", function (/*{Event}*/e) {
			var select = e.target;
			importButton.disabled = !select.value;
		});

		// Setup the import button click event.
		importButton.addEventListener("click", getGtfsData);

		loadAgencyData();

		return select;
	}

	return {
		createGtfsAgencySelect: createGtfsAgencySelect
	};
}));