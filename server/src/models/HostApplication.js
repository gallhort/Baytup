const mongoose = require('mongoose');

const HostApplicationSchema = new mongoose.Schema({
  // Applicant Information
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true
  },

  // Application Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'resubmission_required'],
    default: 'pending'
  },

  // Personal Information
  personalInfo: {
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    address: {
      street: String,
      city: {
        type: String,
        required: [true, 'City is required']
      },
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: 'Algeria'
      }
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    nationalIdNumber: {
      type: String,
      required: [true, 'National ID number is required']
    }
  },

  // Host Intent
  hostIntent: {
    propertyTypes: [{
      type: String,
      enum: ['apartment', 'house', 'villa', 'chalet', 'guesthouse', 'other']
    }],
    vehicleTypes: [{
      type: String,
      enum: ['car', 'motorcycle', 'van', 'suv', 'bike', 'other']
    }],
    numberOfListings: {
      type: Number,
      min: 1,
      required: [true, 'Expected number of listings is required']
    },
    experienceLevel: {
      type: String,
      enum: ['first_time', 'experienced', 'professional'],
      required: [true, 'Experience level is required']
    },
    motivation: {
      type: String,
      maxLength: [500, 'Motivation cannot exceed 500 characters']
    }
  },

  // Documents
  documents: {
    nationalId: {
      front: {
        url: String,
        uploadedAt: Date
      },
      back: {
        url: String,
        uploadedAt: Date
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    proofOfAddress: {
      url: String,
      uploadedAt: Date,
      verified: {
        type: Boolean,
        default: false
      }
    },
    businessLicense: {
      url: String,
      uploadedAt: Date,
      verified: {
        type: Boolean,
        default: false
      },
      required: Boolean
    },
    taxId: {
      number: String,
      document: {
        url: String,
        uploadedAt: Date
      },
      verified: {
        type: Boolean,
        default: false
      }
    }
  },

  // Banking Information
  bankingInfo: {
    bankName: {
      type: String,
      required: [true, 'Bank name is required']
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required']
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required']
    },
    rib: {
      type: String,
      required: [true, 'RIB (Bank ID) is required']
    },
    swift: String,
    verified: {
      type: Boolean,
      default: false
    }
  },

  // Emergency Contact
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required']
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required']
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required']
    }
  },

  // Terms & Agreements
  agreements: {
    termsAccepted: {
      type: Boolean,
      required: [true, 'Must accept terms and conditions'],
      validate: {
        validator: (v) => v === true,
        message: 'Must accept terms and conditions'
      }
    },
    privacyAccepted: {
      type: Boolean,
      required: [true, 'Must accept privacy policy'],
      validate: {
        validator: (v) => v === true,
        message: 'Must accept privacy policy'
      }
    },
    hostGuidelinesAccepted: {
      type: Boolean,
      required: [true, 'Must accept host guidelines'],
      validate: {
        validator: (v) => v === true,
        message: 'Must accept host guidelines'
      }
    },
    acceptedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Review & Approval
  review: {
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    notes: String,
    rejectionReason: String,
    resubmissionNotes: String
  },

  // Application Steps Completion
  stepsCompleted: {
    personalInfo: {
      type: Boolean,
      default: false
    },
    hostIntent: {
      type: Boolean,
      default: false
    },
    documents: {
      type: Boolean,
      default: false
    },
    bankingInfo: {
      type: Boolean,
      default: false
    },
    emergencyContact: {
      type: Boolean,
      default: false
    },
    agreements: {
      type: Boolean,
      default: false
    }
  },

  // Submission
  submittedAt: Date,
  approvedAt: Date,
  rejectedAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (user already has unique index, no need to duplicate)
HostApplicationSchema.index({ status: 1 });
HostApplicationSchema.index({ createdAt: -1 });

// Virtual for completion percentage
HostApplicationSchema.virtual('completionPercentage').get(function() {
  const steps = Object.values(this.stepsCompleted);
  const completed = steps.filter(Boolean).length;
  return Math.round((completed / steps.length) * 100);
});

// Virtual for days since submission
HostApplicationSchema.virtual('daysSinceSubmission').get(function() {
  if (!this.submittedAt) return null;
  const diff = Date.now() - this.submittedAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Method to check if application is complete
HostApplicationSchema.methods.isComplete = function() {
  return Object.values(this.stepsCompleted).every(Boolean);
};

// Method to submit application
HostApplicationSchema.methods.submit = async function() {
  if (!this.isComplete()) {
    throw new Error('Application is not complete');
  }

  this.submittedAt = new Date();
  this.status = 'under_review';
  return await this.save();
};

// Method to approve application
HostApplicationSchema.methods.approve = async function(reviewerId) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.review.reviewedBy = reviewerId;
  this.review.reviewedAt = new Date();

  // Update user role to host
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.user, {
    role: 'host',
    'hostInfo.hostSince': new Date(),
    'hostInfo.verified': true
  });

  return await this.save();
};

// Method to reject application
HostApplicationSchema.methods.reject = async function(reviewerId, reason) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.review.reviewedBy = reviewerId;
  this.review.reviewedAt = new Date();
  this.review.rejectionReason = reason;

  return await this.save();
};

// Method to request resubmission
HostApplicationSchema.methods.requestResubmission = async function(reviewerId, notes) {
  this.status = 'resubmission_required';
  this.review.reviewedBy = reviewerId;
  this.review.reviewedAt = new Date();
  this.review.resubmissionNotes = notes;

  return await this.save();
};

// Prevent duplicate applications
HostApplicationSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existing = await this.constructor.findOne({ user: this.user });
    if (existing) {
      throw new Error('A host application already exists for this user');
    }
  }
  next();
});

module.exports = mongoose.model('HostApplication', HostApplicationSchema);
