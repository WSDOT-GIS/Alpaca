using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using Wsdot.Gtfs.Contract;
using Wsdot.Gtfs.IO;
using ServiceStack.Text;
using System.Text.RegularExpressions;

namespace Wsdot.Alpaca
{
	/// <summary>
	/// Summary description for gtfs
	/// </summary>
	public class gtfs : IHttpHandler
	{
		static readonly Regex restrictedHeaders = new Regex(@"^(
# Restricted Headers
(Accept)
|(Connection)
|(Content-((Length)|(Type)))
|(Date)
|(Expect)
|(Host)
|(If-Modified-Since)
|(Range)
|(Referer)
|(Transfer-Encoding)
|(User-Agent)
|(Proxy-Connection)
# Stuff we don't care about
|(x-.+)
)$", RegexOptions.IgnoreCase | RegexOptions.ExplicitCapture | RegexOptions.IgnorePatternWhitespace);

		public void ProcessRequest(HttpContext context)
		{

			string agencyId = context.Request.Params["agency"];

			context.Response.ContentType = "application/json";

			if (string.IsNullOrWhiteSpace(agencyId))
			{
				context.Response.StatusCode = 400;
				context.Response.Write("{\"error\":\"No \\\"agency\\\" ID was provided\"}");
				return;
			}

			const string urlFmt = "http://www.gtfs-data-exchange.com/agency/{0}/latest.zip";

			// Construct the gtfs-data-exchange URL for the specified agency.
			// E.g., http://www.gtfs-data-exchange.com/agency/intercity-transit/latest.zip
			string url = string.Format(urlFmt, agencyId);

			HttpWebRequest zipRequest = (HttpWebRequest)WebRequest.Create(url);

			CopyHeaders(context.Request, zipRequest);

			GtfsFeed gtfs;
			
			HttpWebResponse response = null;

			try
			{
				response = (HttpWebResponse)zipRequest.GetResponse();
				// TODO: Add Etag to response.

				CopyHeaders(response, context.Response);

				using (var stream = response.GetResponseStream())
				{
					gtfs = stream.ReadGtfs();
				}
				// Write the response to the output stream.
				JsonSerializer.SerializeToStream<GtfsFeed>(gtfs, context.Response.OutputStream);
			}
			catch (WebException ex)
			{
				response = (HttpWebResponse)ex.Response;
				CopyHeaders(response, context.Response);

				using (var stream = response.GetResponseStream())
				{
					stream.CopyTo(context.Response.OutputStream);
				}
			}
			finally
			{
				if (response != null)
				{
					response.Close();
				}
			}

		}

		private void CopyHeaders(HttpRequest httpRequest, HttpWebRequest zipRequest)
		{
			foreach (string key in httpRequest.Headers.Keys)
			{
				if (restrictedHeaders.IsMatch(key))
				{
					continue;
				}
				zipRequest.Headers.Add(key, httpRequest.Headers[key]);
			}
		}

		private void CopyHeaders(HttpWebResponse response, HttpResponse httpResponse)
		{
			httpResponse.StatusCode = (int)response.StatusCode;

			foreach (string key in response.Headers.Keys)
			{
				if (restrictedHeaders.IsMatch(key))
				{
					continue;
				}
				httpResponse.AppendHeader(key, response.Headers[key]);
			}
		}

		public bool IsReusable
		{
			get
			{
				return false;
			}
		}
	}
}