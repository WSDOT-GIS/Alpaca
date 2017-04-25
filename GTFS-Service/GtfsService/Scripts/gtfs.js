/*global define,module,require*/
// if the module has no dependencies, the above pattern can be simplified to
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(["terraformer"], factory);
	} else if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory(require('terraformer'));
	} else {
		// Browser globals (root is window)
		root.Gtfs = factory(root.Terraformer);
	}
}(this, function (Terraformer) {

	function Agency(data) {
		this.agency_id = data.agency_id || null;
		this.agency_name = data.agency_name || null;
		this.agency_url = data.agency_url || null;
		this.agency_timezone = data.agency_timezone || null;
		this.agency_lang = data.agency_lang || null;
		this.agency_phone = data.agency_phone || null;
		this.agency_fare_url = data.agency_fare_url || null;
	}
	
	function Calendar(data) {
		this.service_id = data.service_id;
		this.sunday = data.sunday;
		this.monday = data.monday;
		this.tuesday = data.tuesday;
		this.wednesday = data.wednesday;
		this.thursday = data.thursday;
		this.friday = data.friday;
		this.saturday = data.saturday;
		this.start_date = data.start_date;
		this.end_date = data.end_date;

	}

	function CalendarDate(data) {
		this.date = data.date;
		this.exception_type = data.exception_type;
		this.service_id = data.service_id;

	}

	function FareAttribute(data) {
		this.currency_type = data.currency_type;
		this.fare_id = data.fare_id;
		this.payment_method = data.payment_method;
		this.price = data.price;
		this.transfers = data.transfers;
		this.transfer_duration = data.transfer_duration || null;

	}

	function FareRule(data) {
		this.fare_id = data.fare_id;
		this.route_id = data.route_id || null;
		this.origin_id = data.origin_id || null;
		this.destination_id = data.destination_id || null;
		this.contains_id = data.contains_id || null;

	}

	function FeedInfo(data) {
		this.feed_publisher_name = data.feed_publisher_name;
		this.feed_publisher_url = data.feed_publisher_url;
		this.feed_lang = data.feed_lang;
		this.feed_start_date = data.feed_start_date || null;
		this.feed_end_date = data.feed_end_date || null;
		this.feed_version = data.feed_version || null;

	}

	function Frequency(data) {
		this.trip_id = data.trip_id;
		this.start_time = data.start_time;
		this.end_time = data.end_time;
		this.headway_secs = data.headway_secs;
		this.exact_times = data.exact_times || null;

	}

	function Route(data) {
		this.route_id = data.route_id;
		this.agency_id = data.agency_id || null;
		this.route_short_name = data.route_short_name;
		this.route_long_name = data.route_long_name;
		this.route_desc = data.route_desc || null;
		this.route_type = data.route_type;
		this.route_url = data.route_url || null;
		this.route_color = data.route_color || Route.defaultColor;
		this.route_text_color = data.route_text_color || Route.defaultTextColor;
	}

	Route.defaultColor = "FFFFFF";
	Route.defaultTextColor = "000000";

	function StopTime(data) {
		this.trip_id = data.trip_id;
		this.arrival_time = data.arrival_time;
		this.departure_time = data.departure_time;
		this.stop_id = data.stop_id;
		this.stop_sequence = data.stop_sequence;
		this.stop_headsign = data.stop_headsign || null;
		this.pickup_type = data.pickup_type || null;
		this.drop_off_type = data.drop_off_type || null;
		this.shape_dist_travelled = data.shape_dist_travelled || null;
	}

	function Transfer(data) {
		this.from_stop_id = data.from_stop_id;
		this.to_stop_id = data.to_stop_id;
		this.transfer_type = data.transfer_type;
		this.min_transfer_time = data.min_transfer_time || null;
	}

	function Trip(data) {
		this.route_id = data.route_id;
		this.service_id = data.service_id;
		this.trip_id = data.trip_id;
		this.trip_headsign = data.trip_headsign || null;
		this.trip_shortname = data.trip_shortname || null;
		this.direction_id = data.direction_id || null;
		this.block_id = data.block_id || null;
		this.shape_id = data.shape_id || null;
		this.wheelchair_accessible = data.wheelchair_accessible || null;
		this.bikes_allowed = data.bikes_allowed || null;
	}

	function Gtfs(data) {
		this.FeedInfo = data.FeedInfo ? new FeedInfo(data.FeedInfo) : null;

		this.Agency = data.Agency ? data.Agency.map(function (value) {
			return new Agency(value);
		}) : null;
		this.Calendar = data.Calendar ? data.Calendar.map(function (value) {
			return new Calendar(value);
		}) : null;
		this.CalendarDates = data.CalendarDates ? data.CalendarDates.map(function (value) {
			return new CalendarDate(value);
		}) : null;
		this.FareAttributes = data.FareAttributes ? data.FareAttributes.map(function (value) {
			return new FareAttribute(value);
		}) : null;
		this.FareRules = data.FareRules ? data.FareRules.map(function (value) {
			return new FareRule(value);
		}) : null;
		this.Frequencies = data.Frequencies ? data.Frequencies.map(function (value) {
			return new Frequency(value);
		}) : null;
		this.Routes = data.Routes ? data.Routes.map(function (value) {
			return new Route(value);
		}) : null;
		this.StopTimes = data.StopTimes ? data.StopTimes.map(function (value) {
			return new StopTime(value);
		}) : null;
		this.Transfers = data.Transfers ? data.Transfers.map(function (value) {
			return new Transfer(value);
		}) : null;
		this.Trips = data.Trips ? data.Trips.map(function (value) {
			return new Trip(value);
		}) : null;

		// For Shapes and Stops, try to create a Terraformer.FeatureCollection. If Terraformer isn't defined, instead just use the raw value.
		this.Shapes = data.Shapes ? (Terraformer ? new Terraformer.FeatureCollection(data.Shapes) : data.Shapes) : null;
		this.Stops = data.Stops ? (Terraformer ? new Terraformer.FeatureCollection(data.Stops) : data.Stops) : null;
	}

	Gtfs.Agency = Agency;
	Gtfs.Calendar = Calendar;
	Gtfs.CalendarDate = CalendarDate;
	Gtfs.FareAttribute = FareAttribute;
	Gtfs.FareRule = FareRule;
	Gtfs.FeedInfo = FeedInfo;
	Gtfs.Frequency = Frequency;
	Gtfs.Route = Route;
	Gtfs.StopTime = StopTime;
	Gtfs.Transfer = Transfer;
	Gtfs.Trip = Trip;

	// Just return a value to define the module export.
	// This example returns an object, but the module
	// can return a function as the exported value.
	return Gtfs;
}));