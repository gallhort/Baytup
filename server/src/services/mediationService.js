/**
 * Automatic Mediation Service
 *
 * Calculates mediation proposals based on:
 * - Evidence provided by both parties
 * - Historical data (user ratings, previous disputes)
 * - Dispute reason category
 * - Response timing
 *
 * Score System (0-100):
 * - 0-30: Favor other party (reject claim)
 * - 31-50: Partial compensation (25-50%)
 * - 51-70: Moderate compensation (50-75%)
 * - 71-100: Full compensation to reporter
 */

const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Review = require('../models/Review');

// Score weights for different factors
const SCORE_WEIGHTS = {
  evidenceQuality: 25,      // Quality and quantity of evidence
  historicalReputation: 20, // User's historical rating and disputes
  responseTimeliness: 10,   // Did parties respond within deadline
  reasonSeverity: 15,       // How severe is the dispute reason
  policyCompliance: 15,     // Does claim align with platform policies
  mutualAgreement: 15       // Do parties agree on facts
};

// Severity scores by dispute reason
const REASON_SEVERITY = {
  // High severity (host claims)
  property_damage: 90,
  smoking: 80,
  noise_party: 70,
  unauthorized_guests: 65,

  // Medium severity (host claims)
  excessive_mess: 50,
  guest_behavior: 60,
  rule_violation: 55,
  early_late: 40,

  // High severity (guest claims)
  safety_issue: 95,
  no_access: 90,
  cancellation_host: 85,
  misleading_listing: 75,

  // Medium severity (guest claims)
  dirty_arrival: 60,
  amenities_missing: 55,
  host_unresponsive: 50,
  noise_disturbance: 45,

  // Low/Variable
  payment: 70,
  other: 50
};

// Evidence type weights
const EVIDENCE_WEIGHTS = {
  photo: 15,
  video: 25,
  document: 20,
  receipt: 20,
  message: 10
};

class MediationService {
  /**
   * Generate a mediation proposal for a dispute
   * @param {String} disputeId - The dispute ID
   * @returns {Object} Mediation proposal with score and recommendation
   */
  async generateMediationProposal(disputeId) {
    const dispute = await Dispute.findById(disputeId)
      .populate('booking')
      .populate('reportedBy', 'firstName lastName rating reviewCount')
      .populate({
        path: 'booking',
        populate: [
          { path: 'guest', select: 'firstName lastName rating reviewCount' },
          { path: 'host', select: 'firstName lastName rating reviewCount' },
          { path: 'listing', select: 'title cancellationPolicy' }
        ]
      });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Calculate score factors
    const scoreFactors = await this.calculateScoreFactors(dispute);

    // Calculate total score
    const totalScore = scoreFactors.reduce((sum, factor) => sum + factor.points, 0);

    // Determine compensation based on score
    const compensation = this.determineCompensation(totalScore, dispute);

    // Generate reasoning
    const reasoning = this.generateReasoning(scoreFactors, compensation, dispute);

    // Set 48h deadline for response
    const responseDeadline = new Date();
    responseDeadline.setHours(responseDeadline.getHours() + 48);

    // Check if high value (requires both acceptances)
    const isHighValue = dispute.disputedAmount > 30000;

    // Update dispute with mediation proposal
    dispute.mediation = {
      score: totalScore,
      scoreFactors,
      compensationType: compensation.type,
      guestRefundAmount: compensation.guestRefund,
      hostCompensationAmount: compensation.hostCompensation,
      refundPercent: compensation.refundPercent,
      reasoning,
      proposedAt: new Date(),
      responseDeadline,
      guestResponse: { status: 'pending' },
      hostResponse: { status: 'pending' },
      autoApplied: false,
      requiresAdminReview: isHighValue,
      highValueThreshold: 30000
    };

    dispute.status = 'mediation_proposed';

    // Add timeline event
    dispute.addTimelineEvent(
      'mediation_proposed',
      null,
      'system',
      `Proposition de médiation générée: ${compensation.type} (Score: ${totalScore}/100)`,
      { score: totalScore, compensationType: compensation.type }
    );

    await dispute.save();

    return {
      disputeId: dispute._id,
      score: totalScore,
      scoreFactors,
      compensation,
      reasoning,
      responseDeadline,
      requiresAdminReview: isHighValue
    };
  }

  /**
   * Calculate all score factors for a dispute
   */
  async calculateScoreFactors(dispute) {
    const factors = [];

    // 1. Evidence Quality Score
    const evidenceScore = this.calculateEvidenceScore(dispute);
    factors.push({
      factor: 'evidence_quality',
      points: evidenceScore,
      description: `Qualité des preuves: ${evidenceScore}/${SCORE_WEIGHTS.evidenceQuality} points`
    });

    // 2. Historical Reputation Score
    const reputationScore = await this.calculateReputationScore(dispute);
    factors.push({
      factor: 'historical_reputation',
      points: reputationScore,
      description: `Historique et réputation: ${reputationScore}/${SCORE_WEIGHTS.historicalReputation} points`
    });

    // 3. Response Timeliness Score
    const timelinessScore = this.calculateTimelinessScore(dispute);
    factors.push({
      factor: 'response_timeliness',
      points: timelinessScore,
      description: `Réactivité: ${timelinessScore}/${SCORE_WEIGHTS.responseTimeliness} points`
    });

    // 4. Reason Severity Score
    const severityScore = this.calculateSeverityScore(dispute);
    factors.push({
      factor: 'reason_severity',
      points: severityScore,
      description: `Gravité du problème: ${severityScore}/${SCORE_WEIGHTS.reasonSeverity} points`
    });

    // 5. Policy Compliance Score
    const policyScore = this.calculatePolicyScore(dispute);
    factors.push({
      factor: 'policy_compliance',
      points: policyScore,
      description: `Conformité aux politiques: ${policyScore}/${SCORE_WEIGHTS.policyCompliance} points`
    });

    // 6. Mutual Agreement Score
    const agreementScore = this.calculateAgreementScore(dispute);
    factors.push({
      factor: 'mutual_agreement',
      points: agreementScore,
      description: `Accord entre parties: ${agreementScore}/${SCORE_WEIGHTS.mutualAgreement} points`
    });

    return factors;
  }

  /**
   * Calculate evidence quality score
   */
  calculateEvidenceScore(dispute) {
    const maxScore = SCORE_WEIGHTS.evidenceQuality;

    if (!dispute.evidence || dispute.evidence.length === 0) {
      return Math.round(maxScore * 0.2); // Minimum score without evidence
    }

    // Calculate evidence points
    let evidencePoints = 0;
    const reporterEvidence = dispute.evidence.filter(
      e => e.uploadedBy?.toString() === dispute.reportedBy._id?.toString()
    );
    const otherPartyEvidence = dispute.evidence.filter(
      e => e.uploadedBy?.toString() !== dispute.reportedBy._id?.toString()
    );

    // Reporter's evidence
    for (const evidence of reporterEvidence) {
      evidencePoints += EVIDENCE_WEIGHTS[evidence.type] || 5;
    }

    // Reduce score if other party has counter-evidence
    const counterEvidenceReduction = Math.min(
      otherPartyEvidence.length * 5,
      evidencePoints * 0.3
    );
    evidencePoints -= counterEvidenceReduction;

    // Cap and normalize
    const normalizedScore = Math.min(evidencePoints, 50) / 50 * maxScore;
    return Math.round(Math.max(normalizedScore, maxScore * 0.1));
  }

  /**
   * Calculate reputation score based on user history
   */
  async calculateReputationScore(dispute) {
    const maxScore = SCORE_WEIGHTS.historicalReputation;
    const booking = dispute.booking;

    // Get reporter and other party
    const reporterId = dispute.reportedBy._id;
    const otherPartyId = dispute.reportedByRole === 'guest'
      ? booking.host._id || booking.host
      : booking.guest._id || booking.guest;

    // Get user stats
    const [reporter, otherParty] = await Promise.all([
      User.findById(reporterId).select('rating reviewCount'),
      User.findById(otherPartyId).select('rating reviewCount')
    ]);

    // Get previous disputes
    const [reporterDisputes, otherPartyDisputes] = await Promise.all([
      Dispute.countDocuments({
        reportedBy: reporterId,
        status: 'resolved',
        'finalResolution.guestRefunded': { $gt: 0 }
      }),
      Dispute.countDocuments({
        booking: { $in: await this.getUserBookings(otherPartyId) },
        status: 'resolved'
      })
    ]);

    // Calculate score
    let score = maxScore * 0.5; // Start at 50%

    // Reporter rating bonus (4-5 stars = bonus, below 3 = penalty)
    if (reporter?.rating) {
      score += (reporter.rating - 3) * 2;
    }

    // Other party rating (high rating = slight reduction for reporter)
    if (otherParty?.rating && otherParty.rating > 4.5) {
      score -= 2;
    }

    // Reporter's successful past disputes (credibility)
    score += Math.min(reporterDisputes * 2, 4);

    // Other party's dispute history (if many disputes against them)
    score += Math.min(otherPartyDisputes * 1, 3);

    return Math.round(Math.max(0, Math.min(score, maxScore)));
  }

  /**
   * Get bookings for a user (as guest or host)
   */
  async getUserBookings(userId) {
    const bookings = await Booking.find({
      $or: [{ guest: userId }, { host: userId }]
    }).select('_id');
    return bookings.map(b => b._id);
  }

  /**
   * Calculate timeliness score
   */
  calculateTimelinessScore(dispute) {
    const maxScore = SCORE_WEIGHTS.responseTimeliness;
    let score = maxScore * 0.5;

    // Check if other party responded
    if (dispute.otherPartyResponse?.respondedAt) {
      const responseTime = new Date(dispute.otherPartyResponse.respondedAt) -
                          new Date(dispute.createdAt);
      const hoursToRespond = responseTime / (1000 * 60 * 60);

      // Quick response from other party = less points for reporter
      if (hoursToRespond < 6) {
        score -= 2;
      } else if (hoursToRespond > 24) {
        // Slow response = more points for reporter
        score += 3;
      }
    } else {
      // No response from other party = bonus for reporter
      score += 4;
    }

    // Check if dispute was filed promptly after booking issues
    const booking = dispute.booking;
    if (booking?.endDate) {
      const daysAfterCheckout = (new Date(dispute.createdAt) - new Date(booking.endDate)) /
                                (1000 * 60 * 60 * 24);
      if (daysAfterCheckout <= 2) {
        score += 2; // Filed within 48h of checkout
      } else if (daysAfterCheckout > 7) {
        score -= 3; // Filed too late
      }
    }

    return Math.round(Math.max(0, Math.min(score, maxScore)));
  }

  /**
   * Calculate severity score based on dispute reason
   */
  calculateSeverityScore(dispute) {
    const maxScore = SCORE_WEIGHTS.reasonSeverity;
    const severityRating = REASON_SEVERITY[dispute.reason] || 50;

    // Normalize to max score
    return Math.round((severityRating / 100) * maxScore);
  }

  /**
   * Calculate policy compliance score
   */
  calculatePolicyScore(dispute) {
    const maxScore = SCORE_WEIGHTS.policyCompliance;
    let score = maxScore * 0.5;

    const booking = dispute.booking;
    const listing = booking?.listing;

    // Check cancellation policy alignment
    if (dispute.reason === 'cancellation_host') {
      // Host cancelled = always favor guest
      score = maxScore;
    } else if (['safety_issue', 'no_access'].includes(dispute.reason)) {
      // Safety issues = favor reporter
      score = maxScore * 0.9;
    } else if (dispute.reason === 'property_damage' && dispute.reportedByRole === 'host') {
      // Property damage claims from host need evidence
      const hasPhotoEvidence = dispute.evidence?.some(e =>
        e.type === 'photo' && e.uploadedBy?.toString() === dispute.reportedBy._id?.toString()
      );
      score = hasPhotoEvidence ? maxScore * 0.8 : maxScore * 0.3;
    }

    return Math.round(Math.max(0, Math.min(score, maxScore)));
  }

  /**
   * Calculate agreement score between parties
   */
  calculateAgreementScore(dispute) {
    const maxScore = SCORE_WEIGHTS.mutualAgreement;

    if (!dispute.otherPartyResponse) {
      // No response = favor reporter slightly
      return Math.round(maxScore * 0.6);
    }

    if (dispute.otherPartyResponse.agreedWithReporter) {
      // Other party agrees = strong case for reporter
      return maxScore;
    }

    // Other party disagrees
    // Check if they provided counter-evidence
    const hasCounterEvidence = dispute.evidence?.some(
      e => e.uploadedBy?.toString() !== dispute.reportedBy._id?.toString()
    );

    if (hasCounterEvidence) {
      return Math.round(maxScore * 0.3);
    }

    return Math.round(maxScore * 0.4);
  }

  /**
   * Determine compensation based on total score
   */
  determineCompensation(score, dispute) {
    const disputedAmount = dispute.disputedAmount || dispute.booking?.pricing?.totalAmount || 0;

    if (score >= 71) {
      // Strong case for reporter
      if (dispute.reportedByRole === 'guest') {
        return {
          type: 'full_refund_guest',
          guestRefund: disputedAmount,
          hostCompensation: 0,
          refundPercent: 100
        };
      } else {
        // Host reporting damage
        const compensation = Math.min(disputedAmount, dispute.booking?.pricing?.totalAmount || disputedAmount);
        return {
          type: 'compensate_host',
          guestRefund: 0,
          hostCompensation: compensation,
          refundPercent: 0
        };
      }
    } else if (score >= 51) {
      // Moderate case - partial compensation
      const percent = 50 + Math.round((score - 51) * 1.25); // 50-75%
      if (dispute.reportedByRole === 'guest') {
        return {
          type: 'partial_refund_guest',
          guestRefund: Math.round(disputedAmount * percent / 100),
          hostCompensation: 0,
          refundPercent: percent
        };
      } else {
        return {
          type: 'compensate_host',
          guestRefund: 0,
          hostCompensation: Math.round(disputedAmount * percent / 100),
          refundPercent: 0
        };
      }
    } else if (score >= 31) {
      // Weak case - minimal compensation
      const percent = 25 + Math.round((score - 31) * 1.25); // 25-50%
      if (dispute.reportedByRole === 'guest') {
        return {
          type: 'partial_refund_guest',
          guestRefund: Math.round(disputedAmount * percent / 100),
          hostCompensation: 0,
          refundPercent: percent
        };
      } else {
        return {
          type: 'split',
          guestRefund: Math.round(disputedAmount * (100 - percent) / 100),
          hostCompensation: Math.round(disputedAmount * percent / 100),
          refundPercent: 100 - percent
        };
      }
    } else {
      // Very weak case - reject claim
      return {
        type: 'no_compensation',
        guestRefund: 0,
        hostCompensation: 0,
        refundPercent: 0
      };
    }
  }

  /**
   * Generate human-readable reasoning
   */
  generateReasoning(scoreFactors, compensation, dispute) {
    const totalScore = scoreFactors.reduce((sum, f) => sum + f.points, 0);
    const parts = [];

    parts.push(`Score de médiation: ${totalScore}/100.`);

    // Main factors
    const topFactors = scoreFactors
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    parts.push('Facteurs principaux:');
    for (const factor of topFactors) {
      parts.push(`- ${factor.description}`);
    }

    // Compensation explanation
    const compensationMessages = {
      full_refund_guest: 'Remboursement intégral accordé au voyageur.',
      partial_refund_guest: `Remboursement partiel de ${compensation.refundPercent}% accordé au voyageur.`,
      compensate_host: `Compensation de ${compensation.hostCompensation} DZD accordée à l'hôte.`,
      split: `Partage: ${compensation.refundPercent}% remboursé au voyageur, reste à l'hôte.`,
      no_compensation: 'Réclamation rejetée. Aucune compensation accordée.'
    };

    parts.push('');
    parts.push(`Décision: ${compensationMessages[compensation.type]}`);

    return parts.join('\n');
  }

  /**
   * Process mediation response from a party
   */
  async processMediationResponse(disputeId, userId, userRole, accepted, comment = '') {
    const responseField = userRole === 'guest' ? 'guestResponse' : 'hostResponse';

    // Atomic update: only modify if status is mediation_proposed AND this party hasn't responded yet
    const dispute = await Dispute.findOneAndUpdate(
      {
        _id: disputeId,
        status: 'mediation_proposed',
        [`mediation.${responseField}.status`]: 'pending'
      },
      {
        $set: {
          [`mediation.${responseField}`]: {
            status: accepted ? 'accepted' : 'rejected',
            respondedAt: new Date(),
            comment
          }
        }
      },
      { new: true }
    );

    if (!dispute) {
      throw new Error('Dispute not found, not in mediation stage, or already responded');
    }

    // Add timeline event
    dispute.addTimelineEvent(
      accepted ? 'mediation_accepted' : 'mediation_rejected',
      userId,
      userRole,
      `${userRole === 'guest' ? 'Voyageur' : 'Hôte'} a ${accepted ? 'accepté' : 'refusé'} la médiation`,
      { accepted, comment }
    );

    // Check if both parties responded
    const guestStatus = dispute.mediation.guestResponse.status;
    const hostStatus = dispute.mediation.hostResponse.status;

    if (guestStatus !== 'pending' && hostStatus !== 'pending') {
      if (guestStatus === 'accepted' && hostStatus === 'accepted') {
        // Both accepted - apply mediation
        await this.applyMediation(dispute, false);
      } else if (guestStatus === 'rejected' || hostStatus === 'rejected') {
        // At least one rejected - escalate to admin
        dispute.status = 'contested';
        dispute.mediation.requiresAdminReview = true;
        dispute.addTimelineEvent(
          'escalated_to_admin',
          null,
          'system',
          'Médiation contestée, escalade vers un administrateur',
          {}
        );
      }
    }

    await dispute.save();
    return dispute;
  }

  /**
   * Apply mediation resolution
   */
  async applyMediation(dispute, autoApplied = false) {
    dispute.status = 'resolved';
    dispute.resolutionType = autoApplied ? 'mediation_auto_applied' : 'mediation_accepted';
    dispute.mediation.autoApplied = autoApplied;
    dispute.resolvedAt = new Date();

    dispute.finalResolution = {
      guestRefunded: dispute.mediation.guestRefundAmount,
      hostCompensated: dispute.mediation.hostCompensationAmount,
      processedAt: new Date()
    };

    dispute.resolution = dispute.mediation.reasoning;

    dispute.addTimelineEvent(
      autoApplied ? 'mediation_auto_applied' : 'dispute_resolved',
      null,
      'system',
      autoApplied
        ? 'Médiation appliquée automatiquement (délai 48h expiré sans contestation)'
        : 'Médiation acceptée par les deux parties',
      {
        guestRefunded: dispute.mediation.guestRefundAmount,
        hostCompensated: dispute.mediation.hostCompensationAmount
      }
    );

    // Unfreeze escrow
    dispute.escrowFrozen = false;

    await dispute.save();

    // TODO: Trigger actual refund/compensation via Stripe
    // await stripeService.processDisputeResolution(dispute);

    return dispute;
  }

  /**
   * Check and auto-apply mediation for expired deadlines
   * Should be run by a scheduled job
   */
  async processExpiredMediations() {
    const now = new Date();

    const expiredDisputes = await Dispute.find({
      status: 'mediation_proposed',
      'mediation.responseDeadline': { $lte: now }
    });

    const results = [];

    for (const dispute of expiredDisputes) {
      if (dispute.canAutoApplyMediation()) {
        await this.applyMediation(dispute, true);
        results.push({
          disputeId: dispute._id,
          action: 'auto_applied'
        });
      } else if (dispute.isContested()) {
        dispute.status = 'contested';
        dispute.mediation.requiresAdminReview = true;
        dispute.addTimelineEvent(
          'escalated_to_admin',
          null,
          'system',
          'Délai expiré avec contestation, escalade vers un administrateur',
          {}
        );
        await dispute.save();
        results.push({
          disputeId: dispute._id,
          action: 'escalated'
        });
      } else {
        // High value without both acceptances - escalate
        dispute.status = 'admin_review';
        dispute.mediation.requiresAdminReview = true;
        dispute.addTimelineEvent(
          'escalated_to_admin',
          null,
          'system',
          'Litige de valeur élevée nécessite révision administrative',
          {}
        );
        await dispute.save();
        results.push({
          disputeId: dispute._id,
          action: 'admin_review'
        });
      }
    }

    return results;
  }

  /**
   * Admin decision on contested dispute
   */
  async adminDecision(disputeId, adminId, decision, options = {}) {
    const dispute = await Dispute.findById(disputeId);

    if (!dispute || !['contested', 'admin_review'].includes(dispute.status)) {
      throw new Error('Dispute not found or not awaiting admin review');
    }

    const {
      modifiedRefundAmount,
      modifiedHostCompensation,
      adminNotes,
      customDecision
    } = options;

    dispute.adminReview = {
      reviewedBy: adminId,
      reviewedAt: new Date(),
      decision,
      adminNotes
    };

    if (decision === 'uphold_mediation') {
      // Keep original mediation decision
      dispute.finalResolution = {
        guestRefunded: dispute.mediation.guestRefundAmount,
        hostCompensated: dispute.mediation.hostCompensationAmount,
        processedAt: new Date()
      };
    } else if (decision === 'modify') {
      // Admin modified amounts
      dispute.adminReview.modifiedRefundAmount = modifiedRefundAmount;
      dispute.adminReview.modifiedHostCompensation = modifiedHostCompensation;
      dispute.finalResolution = {
        guestRefunded: modifiedRefundAmount || 0,
        hostCompensated: modifiedHostCompensation || 0,
        processedAt: new Date()
      };
    } else if (decision === 'reject_dispute') {
      // Reject the dispute entirely
      dispute.finalResolution = {
        guestRefunded: 0,
        hostCompensated: 0,
        processedAt: new Date()
      };
    } else if (decision === 'custom') {
      dispute.adminReview.customDecision = customDecision;
      dispute.finalResolution = {
        guestRefunded: modifiedRefundAmount || 0,
        hostCompensated: modifiedHostCompensation || 0,
        processedAt: new Date()
      };
    }

    dispute.status = 'resolved';
    dispute.resolutionType = 'admin_decision';
    dispute.resolvedBy = adminId;
    dispute.resolvedAt = new Date();
    dispute.escrowFrozen = false;

    dispute.addTimelineEvent(
      'admin_decision',
      adminId,
      'admin',
      `Décision administrative: ${decision}`,
      {
        decision,
        guestRefunded: dispute.finalResolution.guestRefunded,
        hostCompensated: dispute.finalResolution.hostCompensated
      }
    );

    await dispute.save();

    return dispute;
  }
}

module.exports = new MediationService();
