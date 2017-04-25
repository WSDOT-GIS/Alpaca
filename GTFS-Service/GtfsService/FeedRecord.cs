using System;
using System.Net.Http.Headers;
using Wsdot.Gtfs.Contract;

namespace GtfsService
{
	/// <summary>
	/// A record of GTFS data, associated agency, and when it was last updated.
	/// </summary>
	internal class FeedRecord
	{
		public string AgencyId { get; set; }
		public DateTimeOffset DateLastUpdated { get; set; }
		public GtfsFeed GtfsData { get; set; }
		public EntityTagHeaderValue Etag { get; set; }
	}
}