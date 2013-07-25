/*
  This proxy page does not have any security checks. It is highly recommended
  that a user deploying this proxy page on their web server, add appropriate
  security checks, for example checking request path, username/password, target
  url, etc.
*/
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Web;

namespace Proxy
{

	/// <summary>
	/// Forwards requests to an ArcGIS Server REST resource. Uses information in
	/// the proxy.config file to determine properties of the server.
	/// </summary>
	public class proxy : IHttpHandler
	{

		public void ProcessRequest(HttpContext context)
		{
			// Ensure that referrer URL is from the same source as the request URL.
			// Exit with an error if this is not the case.
			if (context.Request.IsReferrerSameSite() != true)
			{
				context.Response.ContentType = "application/json";
				context.Response.StatusCode = 403;
				context.Response.StatusDescription = "Invalid referrer";
				context.Response.Write("{\"error\":\"Invalid referrer.\"}");
				return;
			}

			HttpResponse response = context.Response;

			// Get the URL requested by the client (take the entire querystring at once
			//  to handle the case of the URL itself containing querystring parameters)
			string uri = context.Request.Url.Query.Substring(1);

			// Get token, if applicable, and append to the request
			string token = getTokenFromConfigFile(uri);
			if (!String.IsNullOrEmpty(token))
			{
				if (uri.Contains("?"))
					uri += "&token=" + token;
				else
					uri += "?token=" + token;
			}

			System.Net.HttpWebRequest req = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(uri);
			req.Method = context.Request.HttpMethod;
			req.ServicePoint.Expect100Continue = false;
			req.Referer = context.Request.Headers["referer"];

			// Set body of request for POST requests
			if (context.Request.InputStream.Length > 0)
			{
				byte[] bytes = new byte[context.Request.InputStream.Length];
				context.Request.InputStream.Read(bytes, 0, (int)context.Request.InputStream.Length);
				req.ContentLength = bytes.Length;

				string ctype = context.Request.ContentType;
				if (String.IsNullOrEmpty(ctype))
				{
					req.ContentType = "application/x-www-form-urlencoded";
				}
				else
				{
					req.ContentType = ctype;
				}

				using (Stream outputStream = req.GetRequestStream())
				{
					outputStream.Write(bytes, 0, bytes.Length);
				}
			}
			else
			{
				req.Method = "GET";
			}

			// Send the request to the server
			System.Net.WebResponse serverResponse = null;
			try
			{
				serverResponse = req.GetResponse();
			}
			catch (System.Net.WebException webExc)
			{
				response.StatusCode = 500;
				response.StatusDescription = webExc.Status.ToString();
				response.Write(webExc.Response);
				response.End();
				return;
			}

			// Set up the response to the client
			if (serverResponse != null)
			{
				response.ContentType = serverResponse.ContentType;
				using (Stream byteStream = serverResponse.GetResponseStream())
				{

					// Text response
					if (serverResponse.ContentType.Contains("text") ||
						serverResponse.ContentType.Contains("json") ||
						serverResponse.ContentType.Contains("xml"))
					{
						using (StreamReader sr = new StreamReader(byteStream))
						{
							string strResponse = sr.ReadToEnd();
							response.Write(strResponse);
						}
					}
					else
					{
						// Binary response (image, lyr file, other binary file)
						BinaryReader br = new BinaryReader(byteStream);
						if (serverResponse.ContentLength < 0) 
						{
							// If response is sent "chunked", the length is unknown, so we must loop through the bytes
							// until the end of the stream is detected. 
							// (Is there a better way besides waiting for an EndOfStreamException to happen?)
							var byteList = new List<byte>();
							byte b = br.ReadByte();
							while (true) {
								byteList.Add(b);
								try
								{
									b = br.ReadByte();
								}
								catch (EndOfStreamException)
								{
									break;
								}
							}
							var outb = byteList.ToArray();
							response.OutputStream.Write(outb, 0, outb.Length);
						}
						else
						{
							byte[] outb = br.ReadBytes((int)serverResponse.ContentLength);
							// Send the image to the client
							// (Note: if large images/files sent, could modify this to send in chunks)
							response.OutputStream.Write(outb, 0, outb.Length);
						}
						br.Close();

						////// Tell client not to cache the image since it's dynamic
						////response.CacheControl = "no-cache";

					}

					serverResponse.Close();
				}
			}
			response.End();
		}

		public bool IsReusable
		{
			get
			{
				return false;
			}
		}

		// Gets the token for a server URL from a configuration file
		// TODO: ?modify so can generate a new short-lived token from username/password in the config file
		private string getTokenFromConfigFile(string uri)
		{
			try
			{
				ProxyConfig config = ProxyConfig.GetCurrentConfig();
				if (config != null)
					return config.GetToken(uri);
				else
					throw new ApplicationException(
						"Proxy.config file does not exist at application root, or is not readable.");
			}
			catch (InvalidOperationException)
			{
				// Proxy is being used for an unsupported service (proxy.config has mustMatch="true")
				HttpResponse response = HttpContext.Current.Response;
				response.StatusCode = (int)System.Net.HttpStatusCode.Forbidden;
				response.End();
			}
			catch (Exception e)
			{
				if (e is ApplicationException)
					throw e;

				// just return an empty string at this point
				// -- may want to throw an exception, or add to a log file
			}

			return string.Empty;
		}
	}
}