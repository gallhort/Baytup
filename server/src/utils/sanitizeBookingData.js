/**
 * Helper function to sanitize booking data based on user role
 * Hides email and phone from hosts/guests to protect privacy
 * Admins can see all information
 */
const sanitizeUserData = (booking, requesterId, requesterRole) => {
  if (!booking) return booking;

  // Admin sees everything
  if (requesterRole === 'admin') return booking;

  // Convert to plain object if mongoose document
  const bookingObj = booking.toObject ? booking.toObject() : { ...booking };

  // Get IDs as strings for comparison
  const guestId = bookingObj.guest?._id?.toString() || bookingObj.guest?.toString();
  const hostId = bookingObj.host?._id?.toString() || bookingObj.host?.toString();
  const reqId = requesterId.toString();

  // If requester is the guest, hide host's sensitive info
  if (reqId === guestId && bookingObj.host && typeof bookingObj.host === 'object') {
    delete bookingObj.host.email;
    delete bookingObj.host.phone;
  }

  // If requester is the host, hide guest's sensitive info
  if (reqId === hostId && bookingObj.guest && typeof bookingObj.guest === 'object') {
    delete bookingObj.guest.email;
    delete bookingObj.guest.phone;
  }

  return bookingObj;
};

/**
 * Sanitize an array of bookings
 */
const sanitizeBookingsArray = (bookings, requesterId, requesterRole) => {
  if (!Array.isArray(bookings)) return bookings;

  return bookings.map(booking =>
    sanitizeUserData(booking, requesterId, requesterRole)
  );
};

module.exports = {
  sanitizeUserData,
  sanitizeBookingsArray
};
