/*global define*/
/*jslint white:true*/
define([
	"dojox/charting/Chart",
	"dojox/charting/plot2d/ClusteredColumns",
	"dojox/charting/action2d/Highlight",
	"dojox/charting/action2d/Tooltip",
	"dojox/charting/action2d/Shake",
	"dojox/charting/action2d/MouseZoomAndPan",
], function (Chart, ClusteredColumns, Highlight, Tooltip, Shake, MouseZoomAndPan) {
	"use strict";

	/** exports chartUtils
	 */
	return {
		/** Creates the language chart
		 * @param {LanguageData} languageData
		 * @param {string} [chartLevel="Statewide"]
		 * @returns {dojo/charting/Chart}
		 */
		createLanguageChart: function (languageData, chartLevel) {
			var chart, anim_a, anim_c, mouseZoomAndPan;
			chartLevel = chartLevel || "Statewide";
			chart = new Chart("languageChart", {
				title: "Language Proficiency (" + chartLevel + ")",
				titlePos: "top",
				titleGap: 5
			});
			chart.addPlot("default", {
				//animate: { duration: 1000, easing: easing.linear},
				type: ClusteredColumns,
				gap: 5,
			});
			chart.addAxis("x", {
				labels: [
					{ value: 1, text: "English" },
					{ value: 2, text: "Spanish" },
					{ value: 3, text: "IndoEu." },
					{ value: 4, text: "Asian,PI" },
					{ value: 5, text: "Other" }
				],
				dropLabels: false,
				minorLabels: false,
				//title: "Language",
				titleOrientation: "away",
				majorTickStep: 1,
				minorTickStep: 0.5,
				microTickStep: 0.25
			});
			chart.addAxis("y", {
				vertical: true,
				//max: languageData.getTotal() - languageData.english,
				//title: "No. of speakers"
				includeZero: true
			});
			chart.addSeries("Language Proficiency", languageData.toColumnChartSeries());
			mouseZoomAndPan = new MouseZoomAndPan(chart, "default", { axis: "y" });
			anim_a = new Shake(chart, "default", {
				shiftX: 10,
				shiftY: 10
			});
			anim_c = new Tooltip(chart, "default");
			chart.setAxisWindow("y", languageData.getNotEnglishZoomScale(), 0);
			chart.render();
			return chart;
		},

		/** Creates the race chart
		 * @param {string} raceData - [chartLevel="Statewide"]
		 * @param {string} [chartLevel="Statewide"]
		 * @returns {dojo/charting/Chart}
		 */
		createRaceChart: function (/**{RaceData}*/ raceData, chartLevel) {
			var chart, anim_c, mouseZoomAndPan;
			chartLevel = chartLevel || "Statewide";
			chart = new Chart("minorityChart", {
				title: "Race (" + chartLevel + ")",
				titlePos: "top",
				titleGap: 5
			});
			chart.addPlot("default", {
				type: ClusteredColumns,
				labels: false,
				gap: 5
			}).addSeries("Race", raceData.toColumnChartSeries());
			chart.addAxis("x", {
				labels: [
					{ value: 1, text: "White" },
					{ value: 2, text: "Black" },
					{ value: 3, text: "Am. Indian" },
					{ value: 4, text: "Asian" },
					{ value: 5, text: "N.HI / Pac. Isl." },
					{ value: 6, text: "Other" }
				],
				dropLabels: false,
				minorLabels: false,
				//title: "Language",
				titleOrientation: "away",
				majorTickStep: 1,
				minorTickStep: 0.5,
				microTickStep: 0.25
			});
			chart.addAxis("y", {
				vertical: true,
				includeZero: true
			});
			anim_c = new Tooltip(chart, "default");
			mouseZoomAndPan = new MouseZoomAndPan(chart, "default", { axis: "y" });
			chart.render();
			return chart;
		},

		/** Creates the age chart
		 * @param {AgeData} ageData
		 * @param {string} [chartLevel="Statewide"]
		 * @returns {dojo/charting/Chart}
		 */
		createAgeChart: function (ageData, chartLevel) {
			var chart, anim_a, anim_b, anim_c, mouseZoomAndPan, labels = ageData.createLabels();
			chartLevel = chartLevel || "Statewide";

			chart = new Chart("ageChart", {
				title: "Age (" + chartLevel + ")",
				titlePos: "top",
				titleGap: 5
			});
			chart.addPlot("default", {
				////animate: { duration: 1000, easing: easing.linear},
				type: ClusteredColumns,
				gap: 5
			});
			chart.addAxis("x", {
				labels: labels,
				////dropLabels: false,
				minorLabels: false,
				//title: "Age groups",
				titleOrientation: "away",
				majorTickStep: 1,
				minorTickStep: 0.5,
				microTickStep: 0.25
			});
			chart.addAxis("y", {
				vertical: true,
				//max: ageData.getTotal() - ageData.english,
				//title: "Population",
				includeZero: true
			});
			chart.addSeries("Age", ageData.toColumnChartSeries(chartLevel));
			mouseZoomAndPan = new MouseZoomAndPan(chart, "default", { axis: "y" });
			anim_a = new Shake(chart, "default", {
				shiftX: 10,
				shiftY: 10
			});
			anim_b = new Highlight(chart, "default");
			anim_c = new Tooltip(chart, "default");
			chart.render();
			return chart;
		},

		/** Creates the veteran chart
		 * @param {VeteranData} veteranData
		 * @param {string} [chartLevel="Statewide"]
		 * @returns {dojo/charting/Chart}
		 */
		createVeteranChart: function (veteranData, chartLevel) {
			var chart, anim_c;
			chartLevel = chartLevel || "Statewide";
			chart = new Chart("veteranChart", {
				title: "Veterans (" + chartLevel + ")",
				titlePos: "top",
				titleGap: 5
			});
			chart.addPlot("default", {
				type: ClusteredColumns,
				gap: 5
			}).addSeries("Veterans", veteranData.toColumnChartSeries());
			chart.addAxis("x", {
				labels: [
					{ value: 1, text: "Veteran" },
					{ value: 2, text: "Non-Veteran" },
				],
				dropLabels: false,
				minorLabels: false,
				//title: "Language",
				titleOrientation: "away",
				majorTickStep: 1,
				minorTickStep: 0.5,
				microTickStep: 0.25
			});
			chart.addAxis("y", {
				vertical: true,
				includeZero: true
			});
			anim_c = new Tooltip(chart, "default");
			chart.render();
			return chart;
		},

		/** Creates the poverty chart
		 * @param {PovertyData} povertyData
		 * @param {string} [chartLevel="Statewide"]
		 * @returns {dojo/charting/Chart}
		 */
		createPovertyChart: function (/**{PovertyData}*/ povertyData, chartLevel) {
			var chart;
			chartLevel = chartLevel || "Statewide";
			chart = new Chart("povertyChart", {
				title: "Poverty (" + chartLevel + ")",
				titlePos: "top",
				titleGap: 5
			});
			chart.addPlot("default", {
				type: ClusteredColumns,
				gap: 5
			}).addSeries("Poverty", povertyData.toChartSeries());
			chart.addAxis("x", {
				labels: [
					{ value: 1, text: "Poverty" },
					{ value: 2, text: "Non-Poverty" },
				],
				dropLabels: false,
				minorLabels: false,
				titleOrientation: "away",
				majorTickStep: 1,
				minorTickStep: 0.5,
				microTickStep: 0.25
			});
			chart.addAxis("y", {
				vertical: true,
				includeZero: true
			});
			new Tooltip(chart, "default");
			chart.render();
			return chart;
		}
	};
});