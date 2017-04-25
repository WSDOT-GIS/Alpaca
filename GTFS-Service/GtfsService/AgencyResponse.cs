using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace GtfsService
{
	/// <summary>
	/// Represents the response from a request from agency data from GTFS Data Exchange.
	/// </summary>
	public class AgencyResponse
	{
		/// <summary>
		/// Represents the data returned from a query for agency data from the GTFS Data Exchange.
		/// </summary>
		public class AgencyData
		{
			/// <summary>
			/// Information about an agency.
			/// </summary>
			public class AgencyInfo
			{
				/// <summary>
				/// The date that this agency last updated its GTFS data.
				/// </summary>
				public double date_last_updated { get; set; }
				/// <summary>
				/// The base URL for feed data from this agency.
				/// </summary>
				public string feed_baseurl { get; set; }
				/// <summary>
				/// The name of the agency.
				/// </summary>
				public string name { get; set; }
				/// <summary>
				/// The area that the agency is in.
				/// </summary>
				public string area { get; set; }
				/// <summary>
				/// The URL for the agency.
				/// </summary>
				public string url { get; set; }
				/// <summary>
				/// The country that the agency is in.
				/// </summary>
				public string country { get; set; }
				/// <summary>
				/// The state that the agency is in.
				/// </summary>
				public string state { get; set; }
				/// <summary>
				/// The URL for the licence for the GTFS data provided by this agency.
				/// </summary>
				public string license_url { get; set; }
				/// <summary>
				/// The GTFS Data Exchange URL for this agency.
				/// </summary>
				public string dataexchange_url { get; set; }
				/// <summary>
				/// The date that this agency was added to GTFS data exchange.
				/// </summary>
				public double date_added { get; set; }
				/// <summary>
				/// Indicates if this data is officially provided by this agency. (E.g., it would be false if a 3rd party is providing this information in an unofficial capacity on behalf of the agency.)
				/// </summary>
				public bool is_official { get; set; }
				/// <summary>
				/// The unique ID for this agency used with the GTFS Data Exchange API.
				/// </summary>
				public string dataexchange_id { get; set; }
			}

			/// <summary>
			/// Information about a GTFS data ZIP file provided by the agency.
			/// </summary>
			public class Datafile
			{
				/// <summary>
				/// A description of the datafile.
				/// </summary>
				public string description { get; set; }
				/// <summary>
				/// The MD5 sum of the data file.
				/// </summary>
				public string md5sum { get; set; }
				/// <summary>
				/// The URL of the data file.
				/// </summary>
				public string file_url { get; set; }
				/// <summary>
				/// A list of agencies responsible for the datafile.
				/// </summary>
				public List<string> agencies { get; set; }
				/// <summary>
				/// The name of the file.
				/// </summary>
				public string filename { get; set; }
				/// <summary>
				/// The date that the file was added to the GTFS Data Exchange.
				/// </summary>
				public double date_added { get; set; }
				/// <summary>
				/// The user that uploaded the datafile.
				/// </summary>
				public string uploaded_by_user { get; set; }
				/// <summary>
				/// The size of the datafile.
				/// </summary>
				public long size { get; set; }
			}

			/// <summary>
			/// Information about this agency.
			/// </summary>
			public AgencyInfo agency { get; set; }
			/// <summary>
			/// A list of <see cref="Datafile">DataFiles</see> provided by this agency.
			/// </summary>
			public List<Datafile> datafiles { get; set; }
		}

		/// <summary>
		/// The HTTP status text of the response.
		/// </summary>
		public string status_txt { get; set; }
		/// <summary>
		/// The HTTP status code of the response.
		/// </summary>
		public int status_code { get; set; }
		/// <summary>
		/// The agency data.
		/// </summary>
		public AgencyData data { get; set; }
	}
}