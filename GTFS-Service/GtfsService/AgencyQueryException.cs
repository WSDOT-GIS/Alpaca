using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Web;

namespace GtfsService
{
	/// <summary>
	/// An exception that occurs when querying for agency data.
	/// </summary>
	[Serializable]
	public class AgencyQueryException : Exception
	{
		/// <summary>
		/// The HTTP Status Code returned from the query.
		/// </summary>
		public int StatusCode { get; protected set; }

		/// <summary>
		/// Creates a new instance based on an <see cref="AgencyResponse"/>.
		/// </summary>
		/// <param name="agencyResponse">The response from an Agency query.</param>
		public AgencyQueryException(AgencyResponse agencyResponse)
			: base(agencyResponse.status_txt)
		{
			StatusCode = agencyResponse.status_code;
		}
		/// <summary>Creates a new instance.</summary>
		public AgencyQueryException() { }
		/// <summary>
		/// Creates a new instance.
		/// </summary>
		/// <param name="message"></param>
		public AgencyQueryException(string message) : base(message) { }
		/// <summary>
		/// Creates a new instance.
		/// </summary>
		/// <param name="message"></param>
		/// <param name="inner"></param>
		public AgencyQueryException(string message, Exception inner) : base(message, inner) { }
		/// <summary>
		/// Creates a new instance.
		/// </summary>
		/// <param name="info"></param>
		/// <param name="context"></param>
		protected AgencyQueryException(SerializationInfo info, StreamingContext context)
			: base(info, context) { }
	}
}