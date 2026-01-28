const cron = require('node-cron');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPreArrivalReminderEmail } = require('../utils/emailService');

/**
 * ✅ NEW: Send pre-arrival reminder emails (J-7, J-3, J-1)
 */
const sendPreArrivalReminders = async () => {
  try {
    console.log('🔄 Running pre-arrival reminders job...');

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // Calculate target dates
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    const in1Day = new Date(now);
    in1Day.setDate(in1Day.getDate() + 1);

    // Find confirmed/paid bookings with upcoming check-in dates
    const bookingsToRemind = await Booking.find({
      status: { $in: ['confirmed', 'paid'] },
      startDate: {
        $gte: now,
        $lte: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000) // Within 8 days
      }
    }).populate('guest listing');

    console.log(`📊 Found ${bookingsToRemind.length} bookings to check for pre-arrival reminders`);

    for (const booking of bookingsToRemind) {
      try {
        const checkInDate = new Date(booking.startDate);
        checkInDate.setHours(0, 0, 0, 0);

        const daysUntilCheckIn = Math.round((checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // J-7 reminder
        if (daysUntilCheckIn === 7 && !booking.remindersSent?.preArrival7Days) {
          console.log(`📧 Sending J-7 reminder for booking ${booking._id}`);

          const guest = await User.findById(booking.guest._id || booking.guest);
          if (guest && guest.email) {
            await sendPreArrivalReminderEmail(guest, booking, 7);
            booking.remindersSent.preArrival7Days = true;
            await booking.save();
            console.log(`✅ J-7 reminder sent for booking ${booking._id}`);
          }
        }

        // J-3 reminder
        if (daysUntilCheckIn === 3 && !booking.remindersSent?.preArrival3Days) {
          console.log(`📧 Sending J-3 reminder for booking ${booking._id}`);

          const guest = await User.findById(booking.guest._id || booking.guest);
          if (guest && guest.email) {
            await sendPreArrivalReminderEmail(guest, booking, 3);
            booking.remindersSent.preArrival3Days = true;
            await booking.save();
            console.log(`✅ J-3 reminder sent for booking ${booking._id}`);
          }
        }

        // J-1 reminder
        if (daysUntilCheckIn === 1 && !booking.remindersSent?.preArrival1Day) {
          console.log(`📧 Sending J-1 reminder for booking ${booking._id}`);

          const guest = await User.findById(booking.guest._id || booking.guest);
          if (guest && guest.email) {
            await sendPreArrivalReminderEmail(guest, booking, 1);
            booking.remindersSent.preArrival1Day = true;
            await booking.save();
            console.log(`✅ J-1 reminder sent for booking ${booking._id}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing pre-arrival reminder for booking ${booking._id}:`, error.message);
      }
    }

    console.log('✅ Pre-arrival reminders job completed');
  } catch (error) {
    console.error('❌ Error in pre-arrival reminders job:', error);
  }
};

/**
 * Auto-active les bookings confirmées dont la date checkIn est passée
 */
const autoActivateBookings = async () => {
  try {
    console.log('🔄 Running auto-activation job...');
    
    const now = new Date();
    
    // Trouver bookings confirmées avec checkIn passé
    const bookingsToActivate = await Booking.find({
      status: 'confirmed',
      checkIn: { $lte: now }
    })
    .populate('host guest listing');
    
    console.log(`📊 Found ${bookingsToActivate.length} bookings to activate`);
    
    for (const booking of bookingsToActivate) {
      try {
        // Update status
        booking.status = 'active';
        booking.activatedAt = now;
        await booking.save();
        
        console.log(`✅ Activated booking ${booking._id}`);
        
        // Notifications
        if (booking.host && Notification) {
          try {
            await Notification.createNotification({
              recipient: booking.host._id,
              sender: booking.guest._id,
              type: 'booking_started',
              title: 'Séjour commencé',
              message: `Le séjour de ${booking.guest?.firstName || 'Guest'} a commencé.`,
              data: {
                bookingId: booking._id,
                listingTitle: booking.listing?.title
              },
              link: `/dashboard/host-bookings`,
              priority: 'normal'
            });
          } catch (e) {
            console.error('Error creating notification:', e.message);
          }
        }
        
        if (booking.guest && Notification) {
          try {
            await Notification.createNotification({
              recipient: booking.guest._id,
              type: 'booking_started',
              title: 'Bon séjour !',
              message: `Profitez bien de votre séjour${booking.listing?.title ? ` à ${booking.listing.title}` : ''} !`,
              data: {
                bookingId: booking._id
              },
              link: `/dashboard/bookings`,
              priority: 'normal'
            });
          } catch (e) {
            console.error('Error creating notification:', e.message);
          }
        }
      } catch (error) {
        console.error(`❌ Error activating booking ${booking._id}:`, error.message);
      }
    }
    
    console.log('✅ Auto-activation job completed');
  } catch (error) {
    console.error('❌ Error in auto-activation job:', error);
  }
};

/**
 * Auto-complete les bookings actives dont checkout + 6h est passé
 */
const autoCompleteBookings = async () => {
  try {
    console.log('🔄 Running auto-completion job...');
    
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    
    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`📅 Looking for checkOut before: ${sixHoursAgo.toISOString()}`);
    
    // Trouver bookings actives avec checkOut + 6h passé
    const bookingsToComplete = await Booking.find({
      status: 'active',
      checkOut: { $lte: sixHoursAgo }
    })
    .populate('host guest listing');
    
    console.log(`📊 Found ${bookingsToComplete.length} bookings to complete`);
    
    for (const booking of bookingsToComplete) {
      try {
        console.log(`🔍 Processing booking ${booking._id}`);
        console.log(`   - CheckOut: ${booking.checkOut}`);
        console.log(`   - Guest: ${booking.guest?.firstName || 'N/A'}`);
        
        // Vérifier qu'il n'y a pas de dispute ouverte
        const hasOpenDispute = await Dispute.findOne({
          booking: booking._id,
          status: { $in: ['open', 'pending'] }
        });
        
        if (hasOpenDispute) {
          console.log(`⚠️  Booking ${booking._id} has open dispute (${hasOpenDispute._id}), skipping auto-completion`);
          continue;
        }
        
        // Update status
        booking.status = 'completed';
        booking.completedAt = now;
        booking.autoCompleted = true;
        await booking.save();
        
        console.log(`✅ Completed booking ${booking._id}`);
        
        // Notifications avec invitation aux avis
        if (booking.host && Notification) {
          try {
            await Notification.createNotification({
              recipient: booking.host._id,
              sender: booking.guest._id,
              type: 'booking_completed',
              title: 'Séjour terminé',
              message: `Le séjour est terminé. Laissez un avis sur ${booking.guest?.firstName || 'votre voyageur'} !`,
              data: {
                bookingId: booking._id,
                guestName: `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim()
              },
              link: `/bookings/${booking._id}/review`,
              priority: 'normal'
            });
          } catch (e) {
            console.error('Error creating host notification:', e.message);
          }
        }
        
        if (booking.guest && Notification) {
          try {
            await Notification.createNotification({
              recipient: booking.guest._id,
              type: 'booking_completed',
              title: 'Séjour terminé',
              message: `Nous espérons que vous avez passé un bon séjour ! Partagez votre expérience.`,
              data: {
                bookingId: booking._id,
                listingTitle: booking.listing?.title
              },
              link: `/bookings/${booking._id}/review`,
              priority: 'normal'
            });
          } catch (e) {
            console.error('Error creating guest notification:', e.message);
          }
        }
      } catch (error) {
        console.error(`❌ Error completing booking ${booking._id}:`, error.message);
      }
    }
    
    console.log('✅ Auto-completion job completed');
  } catch (error) {
    console.error('❌ Error in auto-completion job:', error);
  }
};

/**
 * ✅ NEW: Send host response reminders at 12h and 22h before deadline
 */
const sendHostResponseReminders = async () => {
  try {
    console.log('🔄 Running host response reminders job...');

    const now = new Date();

    // Find pending bookings with deadline set
    const pendingBookings = await Booking.find({
      status: 'pending',
      'hostResponse.deadline': { $exists: true, $ne: null }
    }).populate('host guest listing');

    console.log(`📊 Found ${pendingBookings.length} pending bookings to check for reminders`);

    for (const booking of pendingBookings) {
      try {
        const deadline = new Date(booking.hostResponse.deadline);
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        // 12h reminder (between 11h and 13h remaining)
        if (hoursUntilDeadline <= 13 && hoursUntilDeadline > 11 && !booking.hostResponse.reminder12hSent) {
          console.log(`📧 Sending 12h reminder for booking ${booking._id}`);

          // Create notification for host
          if (booking.host && Notification) {
            await Notification.createNotification({
              recipient: booking.host._id,
              sender: booking.guest._id,
              type: 'host_response_reminder',
              title: '⏰ Rappel : Demande de réservation en attente',
              message: `Vous avez 12 heures pour répondre à la demande de ${booking.guest?.firstName || 'un voyageur'}. Sans réponse, la réservation expirera automatiquement.`,
              data: {
                bookingId: booking._id,
                listingTitle: booking.listing?.title,
                hoursRemaining: 12,
                guestName: `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim()
              },
              link: `/dashboard/host-bookings`,
              priority: 'high'
            });
          }

          booking.hostResponse.reminder12hSent = true;
          await booking.save();
          console.log(`✅ 12h reminder sent for booking ${booking._id}`);
        }

        // 22h reminder (between 1h and 3h remaining) - URGENT
        if (hoursUntilDeadline <= 3 && hoursUntilDeadline > 1 && !booking.hostResponse.reminder22hSent) {
          console.log(`🚨 Sending 22h (URGENT) reminder for booking ${booking._id}`);

          // Create URGENT notification for host
          if (booking.host && Notification) {
            await Notification.createNotification({
              recipient: booking.host._id,
              sender: booking.guest._id,
              type: 'host_response_urgent',
              title: '🚨 URGENT : Répondez dans les 2 heures !',
              message: `Dernière chance ! Vous avez moins de 2 heures pour accepter ou refuser la demande de ${booking.guest?.firstName || 'un voyageur'}. La réservation expirera automatiquement après ce délai.`,
              data: {
                bookingId: booking._id,
                listingTitle: booking.listing?.title,
                hoursRemaining: 2,
                urgent: true,
                guestName: `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim()
              },
              link: `/dashboard/host-bookings`,
              priority: 'urgent'
            });
          }

          booking.hostResponse.reminder22hSent = true;
          await booking.save();
          console.log(`✅ 22h (URGENT) reminder sent for booking ${booking._id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing reminders for booking ${booking._id}:`, error.message);
      }
    }

    console.log('✅ Host response reminders job completed');
  } catch (error) {
    console.error('❌ Error in host response reminders job:', error);
  }
};

/**
 * ✅ NEW: Auto-expire pending bookings after 24h without host response
 */
const autoExpirePendingBookings = async () => {
  try {
    console.log('🔄 Running auto-expiration job for pending bookings...');

    const now = new Date();

    // Find pending bookings where deadline has passed
    const expiredBookings = await Booking.find({
      status: 'pending',
      'hostResponse.deadline': { $lte: now }
    }).populate('host guest listing');

    console.log(`📊 Found ${expiredBookings.length} bookings to expire`);

    for (const booking of expiredBookings) {
      try {
        console.log(`⏰ Expiring booking ${booking._id} - deadline was ${booking.hostResponse.deadline}`);

        // Update status to expired
        booking.status = 'expired';
        booking.hostResponse.autoExpired = true;
        await booking.save();

        console.log(`✅ Expired booking ${booking._id}`);

        // Notify guest that booking expired
        if (booking.guest && Notification) {
          await Notification.createNotification({
            recipient: booking.guest._id,
            type: 'booking_expired',
            title: 'Demande de réservation expirée',
            message: `Votre demande de réservation pour "${booking.listing?.title || 'un logement'}" a expiré car l'hôte n'a pas répondu dans les 24 heures. Vous pouvez réserver un autre logement.`,
            data: {
              bookingId: booking._id,
              listingTitle: booking.listing?.title,
              reason: 'host_no_response'
            },
            link: `/search`,
            priority: 'normal'
          });
        }

        // Notify host that they missed the deadline
        if (booking.host && Notification) {
          await Notification.createNotification({
            recipient: booking.host._id,
            sender: booking.guest._id,
            type: 'booking_expired_host',
            title: 'Réservation expirée - Délai dépassé',
            message: `La demande de réservation de ${booking.guest?.firstName || 'un voyageur'} a expiré car vous n'avez pas répondu dans les 24 heures. Cela peut affecter votre taux de réponse.`,
            data: {
              bookingId: booking._id,
              listingTitle: booking.listing?.title,
              reason: 'deadline_missed'
            },
            link: `/dashboard/host-bookings`,
            priority: 'high'
          });
        }
      } catch (error) {
        console.error(`❌ Error expiring booking ${booking._id}:`, error.message);
      }
    }

    console.log('✅ Auto-expiration job completed');
  } catch (error) {
    console.error('❌ Error in auto-expiration job:', error);
  }
};

/**
 * Initialiser les cron jobs
 */
const initBookingAutomation = () => {
  console.log('🚀 Initializing booking automation cron jobs...');
  
  // Vérifier si on est en développement
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    console.log('⚙️  DEV MODE: Cron will run every hour');
  }
  
  // Toutes les heures à la minute 0
  // Format: '0 * * * *' = minute 0 de chaque heure
  cron.schedule('0 * * * *', () => {
    const now = new Date();
    console.log(`\n⏰ === CRON JOB TRIGGERED at ${now.toISOString()} ===`);

    autoActivateBookings()
      .then(() => autoCompleteBookings())
      .then(() => sendHostResponseReminders())
      .then(() => autoExpirePendingBookings())
      .then(() => sendPreArrivalReminders())  // ✅ NEW: J-7, J-3, J-1 emails
      .then(() => {
        console.log(`✅ === CRON JOB COMPLETED at ${new Date().toISOString()} ===\n`);
      })
      .catch(error => {
        console.error('❌ Cron job error:', error);
      });
  });

  // ✅ NEW: Run host response checks more frequently (every 15 minutes)
  // This ensures reminders and expirations are timely
  cron.schedule('*/15 * * * *', () => {
    console.log(`\n🔔 === HOST RESPONSE CHECK at ${new Date().toISOString()} ===`);

    sendHostResponseReminders()
      .then(() => autoExpirePendingBookings())
      .then(() => {
        console.log(`✅ === HOST RESPONSE CHECK COMPLETED ===\n`);
      })
      .catch(error => {
        console.error('❌ Host response check error:', error);
      });
  });

  // ✅ NEW: Pre-arrival emails - run once daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log(`\n📧 === PRE-ARRIVAL EMAILS at ${new Date().toISOString()} ===`);

    sendPreArrivalReminders()
      .then(() => {
        console.log(`✅ === PRE-ARRIVAL EMAILS COMPLETED ===\n`);
      })
      .catch(error => {
        console.error('❌ Pre-arrival emails error:', error);
      });
  });

  console.log('✅ Booking automation cron jobs initialized');
  console.log('📅 Schedule: Every hour at minute 0 (0 * * * *)');
  console.log('📅 Schedule: Host response check every 15 minutes (*/15 * * * *)');
  console.log('📅 Schedule: Pre-arrival emails daily at 9:00 AM (0 9 * * *)');

  // Optionnel : Exécuter une fois au démarrage (utile pour dev/test)
  if (isDev) {
    console.log('🔧 DEV MODE: Running cron jobs once on startup...');
    setTimeout(() => {
      autoActivateBookings()
        .then(() => autoCompleteBookings())
        .then(() => sendHostResponseReminders())
        .then(() => autoExpirePendingBookings())
        .then(() => sendPreArrivalReminders())
        .catch(error => console.error('Startup cron error:', error));
    }, 5000); // Attendre 5 secondes après le démarrage
  }
};

module.exports = {
  initBookingAutomation,
  autoActivateBookings,
  autoCompleteBookings,
  sendHostResponseReminders,
  autoExpirePendingBookings,
  sendPreArrivalReminders       // ✅ NEW: J-7, J-3, J-1 emails
};
