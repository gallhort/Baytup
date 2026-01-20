const cron = require('node-cron');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');

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
      .then(() => {
        console.log(`✅ === CRON JOB COMPLETED at ${new Date().toISOString()} ===\n`);
      })
      .catch(error => {
        console.error('❌ Cron job error:', error);
      });
  });
  
  console.log('✅ Booking automation cron jobs initialized');
  console.log('📅 Schedule: Every hour at minute 0 (0 * * * *)');
  
  // Optionnel : Exécuter une fois au démarrage (utile pour dev/test)
  if (isDev) {
    console.log('🔧 DEV MODE: Running cron jobs once on startup...');
    setTimeout(() => {
      autoActivateBookings()
        .then(() => autoCompleteBookings())
        .catch(error => console.error('Startup cron error:', error));
    }, 5000); // Attendre 5 secondes après le démarrage
  }
};

module.exports = {
  initBookingAutomation,
  autoActivateBookings,
  autoCompleteBookings
};
