﻿/*global define*/
/*jslint white:true*/
define([
	"dojox/charting/Chart",
	"dojox/charting/plot2d/Pie",
	"dojox/charting/plot2d/Columns",
	"dojox/charting/action2d/Highlight",
	"dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip",
	"dojox/charting/action2d/Shake",
	"dojox/charting/action2d/MouseZoomAndPan"
], function (Chart, Pie, Columns, Highlight, MoveSlice, Tooltip, Shake, MouseZoomAndPan) {
	"use strict";

	return {
		createLanguageChart: function (languageData) {
			var chart, anim_a, anim_b, anim_c, mouseZoomAndPan;
			chart = new Chart("languageChart", {
				title: "Language Proficiency",
				titlePos: "top",
				titleGap: 5
			});
			chart.addPlot("default", {
				////animate: { duration: 1000, easing: easing.linear},
				type: Columns
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
			anim_b = new Highlight(chart, "default");
			anim_c = new Tooltip(chart, "default");
			chart.setAxisWindow("y", languageData.getNotEnglishZoomScale(), 0);
			chart.render();
			return chart;
		},

		createRaceChart: function (raceData) {
			var chart, anim_a, anim_b, anim_c;
			chart = new Chart("minorityChart", {
				title: "Race",
				titlePos: "top",
				titleGap: 5
			});
			chart.addPlot("default", {
				type: Pie,
				labels: true,
				font: "normal normal 8pt Tahoma",
				fontColor: "black",
				labelOffset: -30,
				radius: 100
			}).addSeries("Race", raceData.toColumnChartSeries());
			anim_a = new MoveSlice(chart, "default");
			anim_b = new Highlight(chart, "default");
			anim_c = new Tooltip(chart, "default");
			chart.render();
			return chart;
		},

		////createAgeChart: function (ageData) {
		////	var chart, anim_a, anim_b, anim_c;
		////	chart = new Chart("ageChart", {
		////		title: "Age",
		////		titlePos: "top",
		////		titleGap: 5
		////	});
		////	chart.addPlot("default", {
		////		type: Pie,
		////		labels: true,
		////		font: "normal normal 8pt Tahoma",
		////		fontColor: "black",
		////		labelOffset: -30,
		////		radius: 100
		////	}).addSeries("Age", ageData.toColumnChartSeries());
		////	anim_a = new MoveSlice(chart, "default");
		////	anim_b = new Highlight(chart, "default");
		////	anim_c = new Tooltip(chart, "default");
		////	chart.render();
		////	return chart;
		////}

		createAgeChart: function (/**{AgeData}*/ ageData) {
			var chart, anim_a, anim_b, anim_c, mouseZoomAndPan, combinedAgeData, labels = [], i = 0;

			combinedAgeData = ageData.combined;

			// Create the labels.
			for (var propertyName in combinedAgeData) {
				if (combinedAgeData.hasOwnProperty(propertyName)) {
					labels.push({
						value: ++i,
						text: propertyName
					});
				}
			}


			chart = new Chart("ageChart", {
				title: "Age",
				titlePos: "top",
				titleGap: 5
			});
			chart.addPlot("default", {
				////animate: { duration: 1000, easing: easing.linear},
				type: Columns
			});
			chart.addAxis("x", {
				labels: labels,
				////dropLabels: false,
				////minorLabels: false,
				//title: "Language",
				titleOrientation: "away",
				majorTickStep: 1,
				minorTickStep: 0.5,
				microTickStep: 0.25
			});
			chart.addAxis("y", {
				vertical: true,
				//max: ageData.getTotal() - ageData.english,
				//title: "No. of speakers"
				includeZero: true
			});
			chart.addSeries("Age", ageData.toColumnChartSeries());
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
	};
});