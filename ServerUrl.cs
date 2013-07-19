using System;
using System.Xml.Serialization;

namespace Proxy
{
	/// <summary>
	/// Represents a Server URL setting from the proxy.config file.
	/// </summary>
	public class ServerUrl
	{
		/// <summary>
		/// The URL
		/// </summary>
		[XmlAttribute("url")]
		public string Url { get; set; }

		/// <summary>
		/// <see langword="true"/> if the the proxy will match any URL that starts with 
		/// <see cref="ServerUrl.Url"/>, <see langword="false"/> otherwise.
		/// </summary>
		[XmlAttribute("matchAll")]
		public bool MatchAll { get; set; }

		/// <summary>
		/// The token for this URL.
		/// </summary>
		[XmlAttribute("token")]
		public string Token { get; set; }

		/// <summary>
		/// If true, a token should be requested if not already present.
		/// </summary>
		[XmlAttribute("dynamicToken")]
		public bool DynamicToken { get; set; }

		/// <summary>
		/// The expiration date of a dynamic token.
		/// </summary>
		[XmlIgnore]
		public DateTime? TokenExpires { get; set; }

		[XmlIgnore]
		public bool TokenHasExpired
		{
			get
			{
				return TokenExpires.HasValue && DateTime.Now < TokenExpires.Value;
			}
		}
	}

}