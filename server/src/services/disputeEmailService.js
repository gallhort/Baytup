const nodemailer = require('nodemailer');

/**
 * Dispute Email Service
 * Envoie des notifications email pour les disputes
 */

class DisputeEmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Notification: Nouveau litige créé
   * @param {Object} dispute - Dispute document
   * @param {Object} booking - Booking document
   */
  async sendDisputeCreatedNotification(dispute, booking) {
    try {
      const reasonLabels = {
        property_damage: 'Dégâts causés par le voyageur',
        excessive_mess: 'Saleté excessive',
        guest_behavior: 'Comportement inapproprié',
        unauthorized_guests: 'Nombre de personnes non respecté',
        noise_party: 'Bruit/fête non autorisée',
        rule_violation: 'Non-respect des règles',
        early_late: 'Arrivée/départ non respecté',
        smoking: 'Fumer dans le logement',
        dirty_arrival: 'Logement sale à l\'arrivée',
        amenities_missing: 'Équipements manquants',
        safety_issue: 'Problème de sécurité',
        misleading_listing: 'Annonce trompeuse',
        no_access: 'Problème d\'accès',
        host_unresponsive: 'Hôte injoignable',
        noise_disturbance: 'Nuisances sonores',
        cancellation_host: 'Annulation par l\'hôte',
        payment: 'Problème de paiement',
        other: 'Autre'
      };

      const reasonText = reasonLabels[dispute.reason] || dispute.reason;

      // Email au reportedBy (celui qui a créé le litige)
      await this.transporter.sendMail({
        from: `"Baytup Support" <${process.env.SMTP_USER}>`,
        to: dispute.reportedBy.email,
        subject: '🔔 Litige créé - Baytup',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff6b6b;">Litige créé</h2>

            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0;"><strong>Votre litige a été enregistré</strong></p>
              <p style="margin: 5px 0 0 0; color: #666;">Notre équipe va l'examiner dans les plus brefs délais.</p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Détails du litige</h3>
              <p><strong>ID:</strong> ${dispute._id}</p>
              <p><strong>Réservation:</strong> ${booking.listing?.title || 'N/A'}</p>
              <p><strong>Motif:</strong> ${reasonText}</p>
              <p><strong>Description:</strong> ${dispute.description}</p>
              <p><strong>Statut:</strong> <span style="color: #ff6b6b; font-weight: bold;">Ouvert</span></p>
            </div>

            <div style="background: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
              <p style="margin: 0;"><strong>Prochaines étapes</strong></p>
              <ul style="margin: 10px 0 0 20px; color: #666;">
                <li>Notre équipe va examiner votre litige</li>
                <li>Vous pouvez ajouter des preuves (photos, documents)</li>
                <li>Vous recevrez une réponse sous 48-72h</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard/disputes/${dispute._id}"
                 style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Voir le litige
              </a>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Baytup Support - Nous sommes là pour vous aider
            </p>
          </div>
        `
      });

      // Email à l'autre partie (host ou guest selon qui a créé le litige)
      const otherParty = dispute.reportedBy._id.toString() === booking.host._id.toString()
        ? booking.guest
        : booking.host;

      await this.transporter.sendMail({
        from: `"Baytup Support" <${process.env.SMTP_USER}>`,
        to: otherParty.email,
        subject: '⚠️ Litige ouvert sur votre réservation - Baytup',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff6b6b;">Litige ouvert</h2>

            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0;"><strong>Un litige a été ouvert concernant votre réservation</strong></p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Détails</h3>
              <p><strong>Réservation:</strong> ${booking.listing?.title || 'N/A'}</p>
              <p><strong>Motif:</strong> ${reasonText}</p>
              <p><strong>Ouvert par:</strong> ${dispute.reportedBy.firstName} ${dispute.reportedBy.lastName}</p>
            </div>

            <div style="background: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
              <p style="margin: 0;"><strong>Vous pouvez:</strong></p>
              <ul style="margin: 10px 0 0 20px; color: #666;">
                <li>Consulter les détails du litige</li>
                <li>Ajouter votre version des faits</li>
                <li>Fournir des preuves</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard/disputes/${dispute._id}"
                 style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Répondre au litige
              </a>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Baytup Support - Médiation équitable
            </p>
          </div>
        `
      });

      console.log('[DisputeEmailService] Notifications sent for dispute', dispute._id);
      return { success: true };
    } catch (error) {
      console.error('[DisputeEmailService] Error sending dispute created notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notification: Litige résolu
   * @param {Object} dispute - Dispute document
   * @param {Object} booking - Booking document
   */
  async sendDisputeResolvedNotification(dispute, booking) {
    try {
      // Email aux deux parties
      const parties = [
        { user: booking.host, role: 'Hôte' },
        { user: booking.guest, role: 'Voyageur' }
      ];

      for (const party of parties) {
        await this.transporter.sendMail({
          from: `"Baytup Support" <${process.env.SMTP_USER}>`,
          to: party.user.email,
          subject: '✅ Litige résolu - Baytup',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #00cc6a;">Litige résolu</h2>

              <div style="background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
                <p style="margin: 0;"><strong>Le litige concernant votre réservation a été résolu</strong></p>
              </div>

              <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0;">Détails</h3>
                <p><strong>Réservation:</strong> ${booking.listing?.title || 'N/A'}</p>
                <p><strong>Résolu par:</strong> ${dispute.resolvedBy?.firstName} ${dispute.resolvedBy?.lastName} (Équipe Baytup)</p>
                <p><strong>Date résolution:</strong> ${new Date(dispute.resolvedAt).toLocaleDateString('fr-FR')}</p>
              </div>

              <div style="background: #fff; padding: 20px; border: 1px solid #ddd; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #333;">Décision</h3>
                <p style="line-height: 1.6;">${dispute.resolution}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard/disputes/${dispute._id}"
                   style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Voir les détails
                </a>
              </div>

              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Merci de votre confiance - Équipe Baytup
              </p>
            </div>
          `
        });
      }

      console.log('[DisputeEmailService] Resolution notifications sent for dispute', dispute._id);
      return { success: true };
    } catch (error) {
      console.error('[DisputeEmailService] Error sending dispute resolved notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notification: Note ajoutée au litige
   * @param {Object} dispute - Dispute document
   * @param {Object} note - Note object
   */
  async sendNoteAddedNotification(dispute, note) {
    try {
      // Notifier toutes les parties sauf celui qui a ajouté la note
      const parties = [];

      if (dispute.reportedBy._id.toString() !== note.user._id.toString()) {
        parties.push(dispute.reportedBy);
      }

      const booking = dispute.booking;
      if (booking.host._id.toString() !== note.user._id.toString()) {
        parties.push(booking.host);
      }
      if (booking.guest._id.toString() !== note.user._id.toString()) {
        parties.push(booking.guest);
      }

      for (const party of parties) {
        await this.transporter.sendMail({
          from: `"Baytup Support" <${process.env.SMTP_USER}>`,
          to: party.email,
          subject: '💬 Nouveau message sur votre litige - Baytup',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2196F3;">Nouveau message</h2>

              <p>Un nouveau message a été ajouté à votre litige :</p>

              <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2196F3;">
                <p style="margin: 0; color: #666; font-size: 12px;">${note.user.firstName} ${note.user.lastName} - ${new Date(note.createdAt).toLocaleString('fr-FR')}</p>
                <p style="margin: 10px 0 0 0; line-height: 1.6;">${note.message}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard/disputes/${dispute._id}"
                   style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Voir et répondre
                </a>
              </div>
            </div>
          `
        });
      }

      return { success: true };
    } catch (error) {
      console.error('[DisputeEmailService] Error sending note added notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DisputeEmailService();
