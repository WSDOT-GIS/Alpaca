/*global define*/
define(["esri/tasks/QueryTask", "esri/tasks/query", "dojo/Deferred"], function (QueryTask, Query, Deferred) {
	var countyData;

	/** Adds the county options to the select.
	 * @param {HTMLSelectElement} select
	 * @param {Object.<string, number>} countyData
	 */
	function addCountiesToSelect(select, countyData) {
		var docFrag, countyName, fipsId, option, countyNames;
		docFrag = document.createDocumentFragment();
		// Get county names and sort.
		countyNames = [];
		for (countyName in countyData) {
			if (countyData.hasOwnProperty(countyName)) {
				countyNames.push(countyName);
			}
		}

		countyNames.sort();

		// Add each county as an option...
		countyNames.forEach(function (countyName) {
			fipsId = countyData[countyName];
			option = document.createElement("option");
			// The option will have the county's FIPS id as its value.
			option.value = fipsId;
			// Strip the " County" off the end of the names. User already knows they're counties.
			option.textContent = countyName.replace(" County", "");
			docFrag.appendChild(option);
		});

		// Add the options to the select.
		select.appendChild(docFrag);

		select.selectedIndex = 0;
	}

	/**
	 * @param {string} [url="http://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/CountyBoundaries/MapServer/0"] - URL to the map service layer providing county data.
	 * @returns {dojo/Deferred}
	 */
	function queryForCountyData(url) {
		var query, queryTask, deferred = new Deferred();

		function convertFeaturesToObject(featureSet) {
			var data;
			if (featureSet && featureSet.features) {
				data = {};
				featureSet.features.forEach(function (g) {
					var name, fipsId;
					name = g.attributes.JURNM;
					fipsId = g.attributes.JURFIPSDSG;
					data[name] = fipsId;
				});
				countyData = data;
				deferred.resolve(data);
			}
		}

		// Set default URL.
		if (!url) {
			url = "http://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/CountyBoundaries/MapServer/0";
		}
		if (!countyData) {
			query = new Query();
			query.where = "1=1";
			query.outFields = ["JURNM", "JURFIPSDSG"];
			query.returnGeometry = false;
			queryTask = new QueryTask(url);
			queryTask.execute(query, convertFeaturesToObject, function (error) {
				deferred.reject(error);
			});
		} else {
			deferred.resolve(countyData);
		}

		return deferred;
	}

	return {
		/**
		 * @param {(string|HTMLSelectElement)} domNode
		 * @param {(string|Object.<string,number>)} countyDataOrUrl
		 */
		createCountySelect: function (domNode, countyDataOrUrl) {
			var select;
			if (typeof domNode === "string") {
				select = document.getElementById(domNode);
			} else if (domNode instanceof HTMLSelectElement) {
				select = domNode;
			} else {
				select = document.createElement("select");
			}

			if (typeof countyDataOrUrl === "object") {
				addCountiesToSelect(select, countyDataOrUrl);
			} else if (!countyDataOrUrl || typeof countyDataOrUrl === "string") {
				queryForCountyData(countyDataOrUrl).then(function (data) {
					addCountiesToSelect(select, data);
				});
			}

			return select;
		}
	};
});