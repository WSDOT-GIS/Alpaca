using System;

namespace GtfsService
{
	/// <summary>
	/// Provides extension methods.
	/// </summary>
	public static class Extensions
	{
		/// <summary>
		/// Converts from a JavaScript Date value in milliseconds to a <see cref="DateTimeOffset"/>.
		/// </summary>
		/// <param name="milliseconds">Number of milliseconds since 1970-1-1T00:00:00</param>
		/// <returns>Returns the <see cref="DateTimeOffset"/> equivalent of <paramref name="milliseconds"/>.</returns>
		public static DateTimeOffset FromJSDateToDateTimeOffset(this double milliseconds)
		{
			return new DateTimeOffset(1970, 1, 1, 0, 0, 0, TimeSpan.Zero).AddMilliseconds(milliseconds*1000);
		}
	}
}