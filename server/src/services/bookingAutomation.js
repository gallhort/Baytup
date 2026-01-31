const cron = require('node-cron');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Review = require('../models/Review');
const Payout = require('../models/Payout');
const Escrow = require('../models/Escrow');
const CashVoucher = require('../models/CashVoucher');
const escrowService = require('./escrowService');
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
 * ✅ NEW: Auto-publish reviews after 14 days (double-blind timeout)
 */
const autoPublishExpiredReviews = async () => {
  try {
    console.log('🔄 Running auto-publish expired reviews job (double-blind timeout)...');

    const count = await Review.autoPublishExpiredReviews();

    console.log(`✅ Auto-publish expired reviews job completed: ${count} reviews published`);
    return count;
  } catch (error) {
    console.error('❌ Error in auto-publish expired reviews job:', error);
  }
};

/**
 * ✅ NEW: Auto-generate payouts J+1 after checkout (if no dispute)
 * Creates automatic payout requests for hosts 24h after booking completion
 */
const autoGeneratePayouts = async () => {
  try {
    console.log('🔄 Running auto-generate payouts job (J+1 after checkout)...');

    const now = new Date();
    // Find bookings completed more than 24 hours ago
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find completed bookings without existing payouts and without disputes
    const eligibleBookings = await Booking.find({
      status: 'completed',
      completedAt: { $lte: oneDayAgo },
      'payment.status': 'paid'
    }).populate('host listing');

    console.log(`📊 Found ${eligibleBookings.length} completed bookings to check for auto-payout`);

    let payoutsCreated = 0;
    let payoutsSkipped = 0;

    for (const booking of eligibleBookings) {
      try {
        // Check if payout already exists for this booking
        const existingPayout = await Payout.findOne({ booking: booking._id });
        if (existingPayout) {
          console.log(`⏭️ Skipping booking ${booking._id} - payout already exists`);
          payoutsSkipped++;
          continue;
        }

        // Check for active disputes
        const activeDispute = await Dispute.findOne({
          booking: booking._id,
          status: { $in: ['pending', 'open', 'in_progress', 'escalated'] }
        });

        if (activeDispute) {
          console.log(`⚠️ Skipping booking ${booking._id} - has active dispute ${activeDispute._id}`);
          payoutsSkipped++;
          continue;
        }

        // Check if host has bank account configured
        const host = await User.findById(booking.host);
        if (!host?.bankAccount?.rib) {
          console.log(`⚠️ Skipping booking ${booking._id} - host ${host?.email} has no bank account configured`);

          // Notify host to configure bank account
          await Notification.createNotification({
            recipient: booking.host,
            type: 'payout_bank_required',
            title: 'Configurez votre RIB pour recevoir vos paiements 💰',
            message: `Vous avez des revenus en attente! Ajoutez votre RIB pour recevoir automatiquement vos paiements.`,
            data: {
              bookingId: booking._id,
              amount: booking.pricing.totalAmount,
              currency: booking.pricing.currency
            },
            link: '/dashboard/host/earnings',
            priority: 'high'
          });

          payoutsSkipped++;
          continue;
        }

        // Calculate payout amount (totalAmount - platform commission)
        // Baytup Fee Structure: 8% guest service fee + 3% host commission = 11% total
        // Host receives: subtotal + cleaningFee - 3% commission
        const baseAmount = booking.pricing.subtotal + (booking.pricing.cleaningFee || 0);
        const hostCommission = booking.pricing.hostCommission || Math.round(baseAmount * 0.03);
        const hostEarnings = baseAmount - hostCommission;
        const platformFee = (booking.pricing.guestServiceFee || booking.pricing.serviceFee || 0) + hostCommission;

        // Create auto-payout
        const payout = await Payout.create({
          host: booking.host,
          booking: booking._id,
          amount: hostEarnings,
          currency: booking.pricing.currency,
          autoGenerated: true,
          autoGeneratedAt: now,
          bankAccount: {
            bankName: host.bankAccount.bankName,
            accountHolderName: host.bankAccount.accountHolderName,
            accountNumber: host.bankAccount.accountNumber,
            rib: host.bankAccount.rib,
            iban: host.bankAccount.iban,
            swiftCode: host.bankAccount.swiftCode
          },
          platformFee: platformFee,
          status: 'pending',
          hostNotes: `Paiement automatique pour la réservation du ${new Date(booking.startDate).toLocaleDateString('fr-FR')} au ${new Date(booking.endDate).toLocaleDateString('fr-FR')}`
        });

        console.log(`✅ Auto-payout created: ${payout._id} for host ${host.email} - ${hostEarnings} ${booking.pricing.currency}`);

        // Notify host
        await Notification.createNotification({
          recipient: booking.host,
          type: 'payout_auto_created',
          title: 'Paiement en cours de traitement! 💸',
          message: `Votre paiement de ${hostEarnings.toLocaleString()} ${booking.pricing.currency} pour "${booking.listing?.title || 'votre annonce'}" est en cours de traitement.`,
          data: {
            payoutId: payout._id,
            bookingId: booking._id,
            amount: hostEarnings,
            currency: booking.pricing.currency,
            listingTitle: booking.listing?.title
          },
          link: '/dashboard/host/earnings',
          priority: 'normal'
        });

        // Notify admin for processing
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
          await Notification.createNotification({
            recipient: admin._id,
            type: 'payout_pending_admin',
            title: 'Nouveau payout à traiter 📋',
            message: `Payout automatique de ${hostEarnings.toLocaleString()} ${booking.pricing.currency} pour ${host.firstName} ${host.lastName} (${host.email})`,
            data: {
              payoutId: payout._id,
              hostId: booking.host,
              amount: hostEarnings,
              currency: booking.pricing.currency
            },
            link: '/admin/payouts',
            priority: 'normal'
          });
        }

        payoutsCreated++;
      } catch (bookingError) {
        console.error(`❌ Error processing booking ${booking._id}:`, bookingError.message);
      }
    }

    console.log(`✅ Auto-generate payouts completed: ${payoutsCreated} created, ${payoutsSkipped} skipped`);
    return { created: payoutsCreated, skipped: payoutsSkipped };
  } catch (error) {
    console.error('❌ Error in auto-generate payouts job:', error);
    return { created: 0, skipped: 0 };
  }
};

/**
 * ✅ NEW: Auto-release escrow funds (checkout + 24h)
 * Releases held funds to host after successful checkout if no disputes
 */
const autoReleaseEscrowFunds = async () => {
  try {
    console.log('🔄 Running auto-release escrow funds job...');

    const now = new Date();

    // Find escrows ready for release
    const escrowsToRelease = await Escrow.find({
      status: 'held',
      releaseScheduledAt: { $lte: now }
    }).populate('booking payer payee');

    console.log(`📊 Found ${escrowsToRelease.length} escrows ready for auto-release`);

    let released = 0;
    let frozen = 0;
    let errors = 0;

    for (const escrow of escrowsToRelease) {
      try {
        // Check for active disputes
        const activeDispute = await Dispute.findOne({
          booking: escrow.booking._id,
          status: { $in: ['open', 'pending', 'in_progress', 'escalated'] }
        });

        if (activeDispute) {
          console.log(`⚠️ Freezing escrow ${escrow._id} - active dispute ${activeDispute._id}`);
          await escrowService.freezeEscrow(escrow, activeDispute);
          frozen++;
          continue;
        }

        // Release the funds
        console.log(`💸 Releasing escrow ${escrow._id} - ${escrow.breakdown.hostAmount} ${escrow.currency}`);
        await escrowService.autoReleaseFunds(escrow);

        // Notify host
        await Notification.createNotification({
          recipient: escrow.payee,
          type: 'payout_completed',
          title: 'Fonds libérés! 💰',
          message: `Votre paiement de ${escrow.breakdown.hostAmount.toLocaleString()} ${escrow.currency} a été libéré et sera transféré sous peu.`,
          data: {
            escrowId: escrow._id,
            bookingId: escrow.booking._id,
            amount: escrow.breakdown.hostAmount,
            currency: escrow.currency
          },
          link: '/dashboard/host/earnings',
          priority: 'high'
        });

        released++;
      } catch (escrowError) {
        console.error(`❌ Error processing escrow ${escrow._id}:`, escrowError.message);
        errors++;
      }
    }

    console.log(`✅ Auto-release escrow completed: ${released} released, ${frozen} frozen, ${errors} errors`);
    return { released, frozen, errors };
  } catch (error) {
    console.error('❌ Error in auto-release escrow job:', error);
    return { released: 0, frozen: 0, errors: 0 };
  }
};

/**
 * ✅ NEW: Expire cash vouchers (Nord Express) after 48h deadline
 */
const expireCashVouchers = async () => {
  try {
    console.log('🔄 Running expire cash vouchers job...');

    // Find expired pending vouchers
    const expiredVouchers = await CashVoucher.findExpiredPending();

    console.log(`📊 Found ${expiredVouchers.length} expired cash vouchers to process`);

    let expired = 0;
    let errors = 0;

    for (const voucher of expiredVouchers) {
      try {
        console.log(`⏰ Expiring voucher ${voucher.voucherNumber}`);

        // Mark voucher as expired
        await voucher.markAsExpired();

        // Update associated booking
        if (voucher.booking) {
          const booking = await Booking.findById(voucher.booking._id || voucher.booking);
          if (booking && booking.status === 'pending_payment') {
            booking.status = 'expired';
            await booking.save();

            // Notify guest
            await Notification.createNotification({
              recipient: booking.guest,
              type: 'voucher_expired',
              title: 'Bon de paiement expiré',
              message: `Votre bon de paiement ${voucher.voucherNumber} a expiré car le paiement n'a pas été effectué dans les 48 heures. Votre réservation a été annulée.`,
              data: {
                voucherNumber: voucher.voucherNumber,
                bookingId: booking._id
              },
              link: '/search',
              priority: 'high'
            });

            // Notify host that booking was cancelled
            await Notification.createNotification({
              recipient: booking.host,
              type: 'booking_cancelled',
              title: 'Réservation annulée',
              message: `Une réservation a été annulée car le paiement n'a pas été effectué dans les délais.`,
              data: {
                bookingId: booking._id
              },
              link: '/dashboard/host-bookings',
              priority: 'normal'
            });
          }
        }

        expired++;
        console.log(`✅ Expired voucher ${voucher.voucherNumber}`);
      } catch (voucherError) {
        console.error(`❌ Error expiring voucher ${voucher.voucherNumber}:`, voucherError.message);
        errors++;
      }
    }

    console.log(`✅ Expire cash vouchers completed: ${expired} expired, ${errors} errors`);
    return { expired, errors };
  } catch (error) {
    console.error('❌ Error in expire cash vouchers job:', error);
    return { expired: 0, errors: 0 };
  }
};

/**
 * ✅ NEW: Send cash voucher reminders (24h and 6h before expiration)
 */
const sendVoucherReminders = async () => {
  try {
    console.log('🔄 Running send voucher reminders job...');

    let reminders24hSent = 0;
    let reminders6hSent = 0;

    // Find vouchers needing 24h reminder
    const vouchers24h = await CashVoucher.findNeedingReminder24h();
    console.log(`📊 Found ${vouchers24h.length} vouchers needing 24h reminder`);

    for (const voucher of vouchers24h) {
      try {
        if (voucher.booking) {
          const booking = await Booking.findById(voucher.booking._id || voucher.booking).populate('guest');
          if (booking && booking.guest) {
            await Notification.createNotification({
              recipient: booking.guest._id,
              type: 'voucher_reminder_24h',
              title: '⏰ Rappel : 24h pour effectuer votre paiement',
              message: `Il vous reste 24 heures pour payer votre réservation à une agence Nord Express. Référence: ${voucher.voucherNumber}`,
              data: {
                voucherNumber: voucher.voucherNumber,
                amount: voucher.amount,
                currency: voucher.currency,
                expiresAt: voucher.expiresAt
              },
              link: `/booking/${booking._id}/voucher`,
              priority: 'high'
            });

            voucher.remindersSent.reminder24h = true;
            await voucher.save();
            reminders24hSent++;
            console.log(`✅ 24h reminder sent for voucher ${voucher.voucherNumber}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error sending 24h reminder for voucher ${voucher.voucherNumber}:`, error.message);
      }
    }

    // Find vouchers needing 6h reminder
    const vouchers6h = await CashVoucher.findNeedingReminder6h();
    console.log(`📊 Found ${vouchers6h.length} vouchers needing 6h reminder`);

    for (const voucher of vouchers6h) {
      try {
        if (voucher.booking) {
          const booking = await Booking.findById(voucher.booking._id || voucher.booking).populate('guest');
          if (booking && booking.guest) {
            await Notification.createNotification({
              recipient: booking.guest._id,
              type: 'voucher_reminder_6h',
              title: '🚨 URGENT : Plus que 6h pour payer !',
              message: `Dernière chance ! Votre bon de paiement ${voucher.voucherNumber} expire dans 6 heures. Rendez-vous vite à une agence Nord Express.`,
              data: {
                voucherNumber: voucher.voucherNumber,
                amount: voucher.amount,
                currency: voucher.currency,
                expiresAt: voucher.expiresAt,
                urgent: true
              },
              link: `/booking/${booking._id}/voucher`,
              priority: 'urgent'
            });

            voucher.remindersSent.reminder6h = true;
            await voucher.save();
            reminders6hSent++;
            console.log(`✅ 6h reminder sent for voucher ${voucher.voucherNumber}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error sending 6h reminder for voucher ${voucher.voucherNumber}:`, error.message);
      }
    }

    console.log(`✅ Send voucher reminders completed: ${reminders24hSent} 24h sent, ${reminders6hSent} 6h sent`);
    return { reminders24hSent, reminders6hSent };
  } catch (error) {
    console.error('❌ Error in send voucher reminders job:', error);
    return { reminders24hSent: 0, reminders6hSent: 0 };
  }
};

/**
 * ✅ NEW: Send review reminders (J+3, J+7 after checkout)
 * Reminds guests and hosts to leave reviews if they haven't yet
 */
const sendReviewReminders = async () => {
  try {
    console.log('🔄 Running review reminders job...');

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Calculate target dates (J+3 and J+7 after checkout)
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Find completed bookings within the 14-day review window
    const completedBookings = await Booking.find({
      status: 'completed',
      endDate: {
        $gte: fourteenDaysAgo, // Within 14-day window
        $lte: now
      }
    }).populate('guest host listing');

    console.log(`📊 Found ${completedBookings.length} completed bookings to check for review reminders`);

    let reminders3DaysSent = 0;
    let reminders7DaysSent = 0;

    for (const booking of completedBookings) {
      try {
        const checkoutDate = new Date(booking.endDate);
        checkoutDate.setHours(0, 0, 0, 0);

        const daysSinceCheckout = Math.round((now.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24));

        // Check if guest has left a review
        const guestReview = await Review.findOne({
          booking: booking._id,
          reviewer: booking.guest._id || booking.guest
        });

        // Check if host has left a review
        const hostReview = await Review.findOne({
          booking: booking._id,
          reviewer: booking.host._id || booking.host
        });

        // J+3 reminder for guest (if no review yet)
        if (daysSinceCheckout === 3 && !guestReview && !booking.remindersSent?.reviewReminder3DaysGuest) {
          console.log(`📧 Sending J+3 review reminder to guest for booking ${booking._id}`);

          await Notification.createNotification({
            recipient: booking.guest._id || booking.guest,
            type: 'review_reminder',
            title: 'Laissez un avis sur votre séjour ⭐',
            message: `Comment s'est passé votre séjour chez ${booking.host.firstName}? Partagez votre expérience!`,
            data: {
              bookingId: booking._id,
              listingId: booking.listing._id,
              daysRemaining: 14 - daysSinceCheckout
            },
            link: `/dashboard/bookings/${booking._id}`,
            priority: 'normal'
          });

          booking.remindersSent = booking.remindersSent || {};
          booking.remindersSent.reviewReminder3DaysGuest = true;
          await booking.save();
          reminders3DaysSent++;
          console.log(`✅ J+3 review reminder sent to guest for booking ${booking._id}`);
        }

        // J+3 reminder for host (if no review yet)
        if (daysSinceCheckout === 3 && !hostReview && !booking.remindersSent?.reviewReminder3DaysHost) {
          console.log(`📧 Sending J+3 review reminder to host for booking ${booking._id}`);

          await Notification.createNotification({
            recipient: booking.host._id || booking.host,
            type: 'review_reminder',
            title: 'Laissez un avis sur votre voyageur ⭐',
            message: `Comment s'est passé le séjour de ${booking.guest.firstName}? Laissez un avis!`,
            data: {
              bookingId: booking._id,
              guestId: booking.guest._id,
              daysRemaining: 14 - daysSinceCheckout
            },
            link: `/dashboard/host-bookings`,
            priority: 'normal'
          });

          booking.remindersSent = booking.remindersSent || {};
          booking.remindersSent.reviewReminder3DaysHost = true;
          await booking.save();
          reminders3DaysSent++;
          console.log(`✅ J+3 review reminder sent to host for booking ${booking._id}`);
        }

        // J+7 reminder for guest (if still no review)
        if (daysSinceCheckout === 7 && !guestReview && !booking.remindersSent?.reviewReminder7DaysGuest) {
          console.log(`📧 Sending J+7 review reminder to guest for booking ${booking._id}`);

          await Notification.createNotification({
            recipient: booking.guest._id || booking.guest,
            type: 'review_reminder',
            title: 'Dernière chance de laisser un avis! ⏰',
            message: `Plus que ${14 - daysSinceCheckout} jours pour partager votre expérience chez ${booking.host.firstName}.`,
            data: {
              bookingId: booking._id,
              listingId: booking.listing._id,
              daysRemaining: 14 - daysSinceCheckout
            },
            link: `/dashboard/bookings/${booking._id}`,
            priority: 'high'
          });

          booking.remindersSent = booking.remindersSent || {};
          booking.remindersSent.reviewReminder7DaysGuest = true;
          await booking.save();
          reminders7DaysSent++;
          console.log(`✅ J+7 review reminder sent to guest for booking ${booking._id}`);
        }

        // J+7 reminder for host (if still no review)
        if (daysSinceCheckout === 7 && !hostReview && !booking.remindersSent?.reviewReminder7DaysHost) {
          console.log(`📧 Sending J+7 review reminder to host for booking ${booking._id}`);

          await Notification.createNotification({
            recipient: booking.host._id || booking.host,
            type: 'review_reminder',
            title: 'Dernière chance de laisser un avis! ⏰',
            message: `Plus que ${14 - daysSinceCheckout} jours pour évaluer ${booking.guest.firstName}.`,
            data: {
              bookingId: booking._id,
              guestId: booking.guest._id,
              daysRemaining: 14 - daysSinceCheckout
            },
            link: `/dashboard/host-bookings`,
            priority: 'high'
          });

          booking.remindersSent = booking.remindersSent || {};
          booking.remindersSent.reviewReminder7DaysHost = true;
          await booking.save();
          reminders7DaysSent++;
          console.log(`✅ J+7 review reminder sent to host for booking ${booking._id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing review reminder for booking ${booking._id}:`, error.message);
      }
    }

    console.log(`✅ Review reminders completed: ${reminders3DaysSent} J+3 sent, ${reminders7DaysSent} J+7 sent`);
    return { reminders3DaysSent, reminders7DaysSent };
  } catch (error) {
    console.error('❌ Error in review reminders job:', error);
    return { reminders3DaysSent: 0, reminders7DaysSent: 0 };
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

  // ✅ NEW: Auto-publish expired reviews (double-blind 14 days) - run daily at 10:00 AM
  cron.schedule('0 10 * * *', () => {
    console.log(`\n⭐ === AUTO-PUBLISH EXPIRED REVIEWS at ${new Date().toISOString()} ===`);

    autoPublishExpiredReviews()
      .then((count) => {
        console.log(`✅ === AUTO-PUBLISH EXPIRED REVIEWS COMPLETED (${count} published) ===\n`);
      })
      .catch(error => {
        console.error('❌ Auto-publish reviews error:', error);
      });
  });

  // ✅ NEW: Auto-generate payouts J+1 - run daily at 11:00 AM
  cron.schedule('0 11 * * *', () => {
    console.log(`\n💸 === AUTO-GENERATE PAYOUTS at ${new Date().toISOString()} ===`);

    autoGeneratePayouts()
      .then((result) => {
        console.log(`✅ === AUTO-GENERATE PAYOUTS COMPLETED (${result.created} created, ${result.skipped} skipped) ===\n`);
      })
      .catch(error => {
        console.error('❌ Auto-generate payouts error:', error);
      });
  });

  // ✅ NEW: Review reminders J+3 and J+7 - run daily at 12:00 PM
  cron.schedule('0 12 * * *', () => {
    console.log(`\n⭐ === REVIEW REMINDERS at ${new Date().toISOString()} ===`);

    sendReviewReminders()
      .then((result) => {
        console.log(`✅ === REVIEW REMINDERS COMPLETED (${result.reminders3DaysSent} J+3 sent, ${result.reminders7DaysSent} J+7 sent) ===\n`);
      })
      .catch(error => {
        console.error('❌ Review reminders error:', error);
      });
  });

  // ✅ NEW: Auto-release escrow funds - run every 2 hours
  cron.schedule('0 */2 * * *', () => {
    console.log(`\n🔓 === AUTO-RELEASE ESCROW at ${new Date().toISOString()} ===`);

    autoReleaseEscrowFunds()
      .then((result) => {
        console.log(`✅ === AUTO-RELEASE ESCROW COMPLETED (${result.released} released, ${result.frozen} frozen) ===\n`);
      })
      .catch(error => {
        console.error('❌ Auto-release escrow error:', error);
      });
  });

  // ✅ NEW: Cash voucher expiration and reminders - run every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    console.log(`\n💵 === CASH VOUCHER CHECK at ${new Date().toISOString()} ===`);

    sendVoucherReminders()
      .then(() => expireCashVouchers())
      .then((result) => {
        console.log(`✅ === CASH VOUCHER CHECK COMPLETED ===\n`);
      })
      .catch(error => {
        console.error('❌ Cash voucher check error:', error);
      });
  });

  console.log('✅ Booking automation cron jobs initialized');
  console.log('📅 Schedule: Every hour at minute 0 (0 * * * *)');
  console.log('📅 Schedule: Host response check every 15 minutes (*/15 * * * *)');
  console.log('📅 Schedule: Pre-arrival emails daily at 9:00 AM (0 9 * * *)');
  console.log('📅 Schedule: Auto-publish expired reviews daily at 10:00 AM (0 10 * * *)');
  console.log('📅 Schedule: Auto-generate payouts daily at 11:00 AM (0 11 * * *)');
  console.log('📅 Schedule: Review reminders daily at 12:00 PM (0 12 * * *)');
  console.log('📅 Schedule: Auto-release escrow every 2 hours (0 */2 * * *)');
  console.log('📅 Schedule: Cash voucher check every 30 minutes (*/30 * * * *)');

  // Optionnel : Exécuter une fois au démarrage (utile pour dev/test)
  if (isDev) {
    console.log('🔧 DEV MODE: Running cron jobs once on startup...');
    setTimeout(() => {
      autoActivateBookings()
        .then(() => autoCompleteBookings())
        .then(() => sendHostResponseReminders())
        .then(() => autoExpirePendingBookings())
        .then(() => sendPreArrivalReminders())
        .then(() => autoPublishExpiredReviews())  // ✅ Double-blind review auto-publish
        .then(() => autoGeneratePayouts())        // ✅ Auto-payout J+1
        .then(() => sendReviewReminders())        // ✅ NEW: Review reminders J+3, J+7
        .then(() => autoReleaseEscrowFunds())     // ✅ Auto-release escrow
        .then(() => sendVoucherReminders())       // ✅ NEW: Cash voucher reminders
        .then(() => expireCashVouchers())         // ✅ NEW: Expire cash vouchers
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
  sendPreArrivalReminders,       // ✅ J-7, J-3, J-1 emails
  autoPublishExpiredReviews,     // ✅ Double-blind 14 days auto-publish
  autoGeneratePayouts,           // ✅ Auto-payout J+1 after checkout
  sendReviewReminders,           // ✅ NEW: Review reminders J+3 and J+7
  autoReleaseEscrowFunds,        // ✅ Auto-release escrow (checkout + 24h)
  expireCashVouchers,            // ✅ NEW: Expire cash vouchers after 48h
  sendVoucherReminders           // ✅ NEW: Send 24h and 6h voucher reminders
};
