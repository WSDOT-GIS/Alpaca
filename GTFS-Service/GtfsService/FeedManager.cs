using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Wsdot.Gtfs.Contract;
using Wsdot.Gtfs.IO;

namespace GtfsService
{
	/// <summary>
	/// Manages the in-memory GTFS feeds. Retrieves remote feeds if there is no corresponding feed
	/// or if a newer feed is available than what is stored.
	/// </summary>
	internal class FeedManager
	{
		SynchronizedCollection<FeedRecord> _feedList = new SynchronizedCollection<FeedRecord>();
		static private FeedManager _instance = null;

		protected FeedManager()
		{
		}

		/// <summary>
		/// Get instance of this Singleton class.
		/// </summary>
		/// <returns></returns>
		public static FeedManager GetInstance()
		{
			if (_instance == null)
			{
				_instance = new FeedManager();
			}
			return _instance;
		}

		/// <summary>
		/// Response from a request for a GTFS data feed from the <see cref="FeedManager"/>.
		/// </summary>
		public class FeedRequestResponse
		{
			/// <summary>
			/// Indicates that the data on the GTFS Data Exchange website has not been updated since the previous request.
			/// </summary>
			public bool NotModified { get; set; }
			/// <summary>
			/// Information about the returned GTFS data (including the GTFS data itself).
			/// This may be <see langword="null"/> if <see cref="FeedRequestResponse.NotModified"/> is <see langword="true"/>.
			/// </summary>
			public FeedRecord FeedRecord { get; set; }
		}

		/// <summary>
		/// Retrieves GTFS data for a specified agency.
		/// Data will be retrieved from an in-memory list if available and up-to-date.
		/// Otherwise the GTFS data will be requested from the GTFS Data Exchange website
		/// and stored for future use.
		/// </summary>
		/// <param name="agencyId">The GTFS-Data-Exchange agency identifier.</param>
		/// <param name="lastModified">If an "If-Modified-Since" header is present, that value can be used here. Otherwise omit.</param>
		/// <param name="etags">If the HTTP request contains "If-None-Match", it can be passed in here. Otherwise it can be omitted.</param>
		/// <returns>Returns a <see cref="FeedRequestResponse"/>.</returns>
		/// <exception cref="ArgumentException">Thrown if <paramref name="agencyId"/> is <see langword="null"/> or consists only of whitespace.</exception>
		/// <exception cref="AgencyQueryException">Thrown if the query to gtfs-data-exchange for information fails.</exception>
		public FeedRequestResponse GetGtfs(string agencyId,
DateTimeOffset? lastModified = default(DateTimeOffset?),
			IEnumerable<EntityTagHeaderValue> etags = null)
		{
			if (string.IsNullOrWhiteSpace(agencyId))
			{
				throw new ArgumentException("The agencyId was not provided.");
			}

			// Get the record with the matching agency ID.
			var feedRecord = _feedList.FirstOrDefault(r => string.Compare(r.AgencyId, agencyId, true) == 0);

			// Check to see if there are matching Etags...
			if (feedRecord != null && feedRecord.Etag != null && etags != null)
			{
				var match = etags.FirstOrDefault(et => et == feedRecord.Etag);
				if (match != null)
				{
					return new FeedRequestResponse { NotModified = true };
				}
			}

			HttpClient client = null;
			GtfsFeed gtfs = feedRecord != null ? feedRecord.GtfsData : null;
			EntityTagHeaderValue outEtag = null;

			AgencyResponse agencyResponse = null;
			FeedRequestResponse output = null;

			try
			{
				// Check for an existing record...

				// Check online to see if there is a newer feed available. 
				// This will be skipped if there is no matching GTFS feed stored for the specified agency.
				const string urlFmt = "http://www.gtfs-data-exchange.com/api/agency?agency={0}";
				Uri uri = new Uri(string.Format(urlFmt, agencyId));

				client = new HttpClient();
				client.DefaultRequestHeaders.IfModifiedSince = lastModified;
				if (etags != null)
				{
					foreach (var etag in etags)
					{
						client.DefaultRequestHeaders.IfNoneMatch.Add(etag);
					}
				}

				client.GetAsync(uri).ContinueWith((t) =>
				{
					outEtag = t.Result.Headers.ETag;
					if (t.Result.StatusCode == HttpStatusCode.NotModified)
					{
						output = new FeedRequestResponse
						{
							NotModified = true
						};
					}
					else if (t.Result.StatusCode == HttpStatusCode.OK)
					{
						t.Result.Content.ReadAsStreamAsync().ContinueWith(streamTask => {
							using (var streamReader = new StreamReader(streamTask.Result))
							using (var jsonReader = new JsonTextReader(streamReader))
							{
								var serializer = JsonSerializer.Create();
								agencyResponse = serializer.Deserialize<AgencyResponse>(jsonReader);
							}
						}).Wait();
					}
				}).Wait();

				// If the request for GTFS info returned a "Not Modified" response, return now.
				if (output == null)
				{
					if (agencyResponse.status_code != 200)
					{
						throw new AgencyQueryException(agencyResponse);
					}

					if (lastModified.HasValue && lastModified.Value >= agencyResponse.data.agency.date_last_updated.FromJSDateToDateTimeOffset())
					{
						if (feedRecord == null)
						{
							feedRecord = new FeedRecord
							{
								DateLastUpdated = lastModified.Value,
								Etag = outEtag
							};
						}
					}
					else
					{

						if (feedRecord == null || (agencyResponse.data.agency.date_last_updated.FromJSDateToDateTimeOffset() > feedRecord.DateLastUpdated))
						{
							// Get the GTFS file...
							Uri zipUri = new Uri(String.Join("/", agencyResponse.data.agency.dataexchange_url.TrimEnd('/'), "latest.zip"));

							// TODO: make the request and parse the GTFS...
							if (client == null)
							{
								client = new HttpClient();
							}
							else
							{
								client.DefaultRequestHeaders.Clear();
							}

							client.GetStreamAsync(zipUri).ContinueWith(t =>
							{
								t.Result.ReadGtfsAsync().ContinueWith(gtfsTask => {
									gtfs = gtfsTask.Result;
									// Delete the existing feedRecord.
									if (feedRecord != null)
									{
										_feedList.Remove(feedRecord);
									}
									feedRecord = new FeedRecord
									{
										GtfsData = gtfs,
										AgencyId = agencyId,
										DateLastUpdated = agencyResponse.data.agency.date_last_updated.FromJSDateToDateTimeOffset(),
										Etag = outEtag
									};
									// Add the new GTFS feed data to the in-memory collection.
									_feedList.Add(feedRecord);
								}).Wait();
							}).Wait();
						}
					}
				}

			}
			finally
			{
				if (client != null)
				{
					client.Dispose();
				}
			}




			return new FeedRequestResponse
			{
				FeedRecord = feedRecord
			};


		}

	}
}