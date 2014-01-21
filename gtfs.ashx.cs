using Newtonsoft.Json;
using System;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using System.Web;
using Wsdot.Gtfs.Contract;
using Wsdot.Gtfs.IO;

namespace Wsdot.Alpaca
{
	/// <summary>
	/// Summary description for gtfs
	/// </summary>
	public class gtfs : IHttpHandler
	{
		const long responseSizeNoBufferThreshold = 0x4000L;

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
|(Server)
)$", RegexOptions.IgnoreCase | RegexOptions.ExplicitCapture | RegexOptions.IgnorePatternWhitespace);

		private void WriteError(HttpContext context, string message)
		{
			context.Response.StatusCode = 400;
			context.Response.Write(string.Format("{{\"error\":\"{0}\"}}", message));
		}

		public void ProcessRequest(HttpContext context)
		{

			// Get the requested agency.
			string agencyId = context.Request.Params["agency"];
			string include = context.Request.Params["include"];
			GtfsFileOptions includeOptions = GtfsFileOptions.All;
			if (!string.IsNullOrWhiteSpace(include))
			{
				if (!Enum.TryParse<GtfsFileOptions>(include, true, out includeOptions))
				{
					WriteError(context, "Invalid \"include\" option");
					return;
				}
			}

			context.Response.ContentType = "application/json";

			if (string.IsNullOrWhiteSpace(agencyId))
			{
				WriteError(context, "No \\\"agency\\\" ID was provided");
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

				// Set buffer output to prevent out-of-memory errors.
				context.Response.BufferOutput = response.ContentLength < responseSizeNoBufferThreshold;


				CopyHeaders(response, context.Response);

				using (var stream = response.GetResponseStream())
				{
					gtfs = stream.ReadGtfs();
				}
				// Write the response to the output stream.
				var jsonSettings = new JsonSerializerSettings
				{
					NullValueHandling = NullValueHandling.Ignore,
					DateFormatHandling = DateFormatHandling.IsoDateFormat,
					DateTimeZoneHandling = DateTimeZoneHandling.Local,
					TypeNameHandling = TypeNameHandling.None
				};
				var jsonSerializer = JsonSerializer.Create(jsonSettings);
				using (var jsWriter = new StreamWriter(context.Response.OutputStream))
				{
					jsonSerializer.Serialize(jsWriter, gtfs);

				}
			}
			catch (WebException ex)
			{
				// If the server responds with a 304 (Not Modified) status, this exception occurs and we need to handle it.
				// This allows the browser to cache responses to this handler.
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

		/// <summary>
		/// Copies the request headers from this <see cref="IHttpHandler">handler</see> request to the request for the GTFS zip file. 
		/// Copying the headers will allow the browser to cache the request to this <see cref="IHttpHandler">handler</see>.
		/// </summary>
		/// <param name="httpRequest">The request to this handler.</param>
		/// <param name="gtfsZipRequest">The request for the GTFS ZIP file.</param>
		private static void CopyHeaders(HttpRequest httpRequest, HttpWebRequest gtfsZipRequest)
		{
			foreach (string key in httpRequest.Headers.Keys)
			{
				if (restrictedHeaders.IsMatch(key))
				{
					if (key == "If-Modified-Since")
					{
						gtfsZipRequest.IfModifiedSince = DateTime.Parse(httpRequest.Headers[key]);
					}
				}
				else
				{
					gtfsZipRequest.Headers.Add(key, httpRequest.Headers[key]);
				}
			}
		}

		/// <summary>
		/// Copies the headers from the GTFS response to this handler's response.
		/// </summary>
		/// <param name="response">GTFS ZIP file response.</param>
		/// <param name="gtfsZipResponse">This handler's response.</param>
		private static void CopyHeaders(HttpWebResponse response, HttpResponse gtfsZipResponse)
		{
			gtfsZipResponse.StatusCode = (int)response.StatusCode;

			foreach (string key in response.Headers.Keys)
			{
				if (restrictedHeaders.IsMatch(key))
				{
					continue;
				}
				gtfsZipResponse.AppendHeader(key, response.Headers[key]);
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