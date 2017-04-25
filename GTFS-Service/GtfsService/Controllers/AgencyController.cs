using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web.Http;
using System.Web.Http.Results;

namespace GtfsService.Controllers
{
	/// <summary>
	/// This controller provides data about GTFS Data-Exchange agencies.
	/// </summary>
	public class AgencyController : ApiController
	{
		/// <summary>
		/// Returns data about either a single agencies or all GTFS Data-Exchange agencies.
		/// </summary>
		/// <param name="dataexchange_id">A GTFS Data-Exchange agency. If omitted, data for all agencies will be returned.</param>
		/// <returns>Returns an <see cref="HttpResponseMessage"/> that redirects to the equivalent GTFS Data Exchange endpoint.</returns>
		[Route("api/agency/{dataexchange_id?}")]
		[Route("api/agencies/{dataexchange_id?}")]
		public HttpResponseMessage Get(string dataexchange_id=null)
		{
			var url = ConfigurationManager.AppSettings["gtfs-url"].TrimEnd('/');
			var urlSuffix = string.IsNullOrWhiteSpace(dataexchange_id) ? "/api/agencies" : string.Format("/api/agency?agency={0}", dataexchange_id);
			url = url + urlSuffix;

			// If a callback parameter has been specified (i.e., a JSONP request), a redirect can be used.
			// Otherwise, since GTFS Data Exchange does not support CORS, the response will merely be copied.
			if (Request.GetQueryNameValuePairs().Count(s => s.Key == "callback") > 0)
			{
				HttpResponseMessage output = Request.CreateResponse(HttpStatusCode.Redirect);
				output.Headers.Location = new Uri(url);
				return output;
			}
			else
			{
				HttpResponseMessage message = null;

				using (HttpClient client = new HttpClient())
				{
					client.DefaultRequestHeaders.Add("If-None-Match", Request.Headers.IfNoneMatch.Select(s => s.Tag));
					client.GetAsync(url).ContinueWith(t =>
					{
						message = t.Result;
					}).Wait();
				}

				message.Headers.CacheControl = new CacheControlHeaderValue();

				return message;
			}
		}
	}
}
