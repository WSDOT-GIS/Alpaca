using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web.Http;
using Wsdot.Gtfs.Contract;
using Wsdot.Gtfs.IO;

namespace GtfsService.Controllers
{
	/// <summary>
	/// This controller returns data from an agency's GTFS feed.
	/// </summary>
	public class FeedController : ApiController
	{
		FeedManager _feedManager = FeedManager.GetInstance();

		/// <summary>
		/// Gets GTFS data from an agency. Supports "If-None-Match" and "If-Modified-Since" headers.
		/// </summary>
		/// <param name="agency">GTFS Data Exchange agency ID.</param>
		/// <returns>Returns an <see cref="HttpResponseMessage">HTTP Response</see> with GTFS data.</returns>
		[Route("api/feed/{agency}")]
		public HttpResponseMessage Get(string agency)
		{
			DateTimeOffset? ifModifiedSince = Request.Headers.IfModifiedSince;
			HttpHeaderValueCollection<EntityTagHeaderValue> eTags = Request.Headers.IfNoneMatch;
			HttpResponseMessage output;

			try
			{
				var feedResponse = _feedManager.GetGtfs(agency, ifModifiedSince, eTags);

				if (feedResponse.NotModified)
				{
					output = Request.CreateResponse(HttpStatusCode.NotModified);
					output.Headers.CacheControl = new CacheControlHeaderValue();
				}
				else
				{
					var feedRecord = feedResponse.FeedRecord;

					if (ifModifiedSince.HasValue && feedRecord.DateLastUpdated <= ifModifiedSince.Value)
					{
						output = Request.CreateResponse(HttpStatusCode.NotModified);
					}
					else
					{
						output = Request.CreateResponse<GtfsFeed>(feedRecord.GtfsData);
						output.Headers.Add("Date-Last-Modified", feedRecord.DateLastUpdated.ToString());
					}

					output.Headers.CacheControl = new CacheControlHeaderValue
					{
						NoCache = false,
						Public = true
					};
					output.Headers.ETag = feedRecord.Etag;
				}

			}
			catch (AgencyQueryException ex)
			{
				// Handle cases where the agency is not valid.
				output = Request.CreateErrorResponse((HttpStatusCode)ex.StatusCode, ex.Message);
			}
			return output;
		}
	}
}