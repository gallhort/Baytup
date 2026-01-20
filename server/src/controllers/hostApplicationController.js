const HostApplication = require('../models/HostApplication');
const User = require('../models/User');
const Notification = require('../models/Notification');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const { sendHostApplicationSubmitted, sendHostApplicationApproved, sendHostApplicationRejected, sendHostApplicationResubmission } = require('../utils/emailService');

// @desc    Create or get host application
// @route   POST /api/host-applications
// @access  Private
const createApplication = async (req, res, next) => {
  try {
    // Check if user already has an application
    let application = await HostApplication.findOne({ user: req.user.id });

    if (application) {
      return res.status(200).json({
        status: 'success',
        message: 'Application already exists',
        data: { application }
      });
    }

    // Get user data to pre-fill some fields
    const user = await User.findById(req.user.id);

    // Create new application with initial data and defaults
    const applicationData = {
      user: req.user.id,
      personalInfo: {
        phone: req.body.phone || '',
        address: {
          street: req.body.street || '',
          city: req.body.city || '',
          state: req.body.state || '',
          postalCode: req.body.postalCode || '',
          country: 'Algeria'
        },
        dateOfBirth: req.body.dateOfBirth || null,
        nationalIdNumber: req.body.nationalIdNumber || ''
      },
      hostIntent: {
        propertyTypes: req.body.propertyTypes || [],
        vehicleTypes: req.body.vehicleTypes || [],
        numberOfListings: req.body.numberOfListings || 1,
        experienceLevel: req.body.experienceLevel || 'first_time',
        motivation: req.body.motivation || ''
      },
      bankingInfo: {
        bankName: req.body.bankName || '',
        accountHolderName: req.body.accountHolderName || `${user.firstName} ${user.lastName}`,
        accountNumber: req.body.accountNumber || '',
        rib: req.body.rib || '',
        swift: req.body.swift || ''
      },
      emergencyContact: {
        name: req.body.emergencyContactName || '',
        relationship: req.body.emergencyContactRelationship || '',
        phone: req.body.emergencyContactPhone || ''
      },
      agreements: {
        termsAccepted: req.body.termsAccepted || false,
        privacyAccepted: req.body.privacyAccepted || false,
        hostGuidelinesAccepted: req.body.hostGuidelinesAccepted || false
      },
      stepsCompleted: {
        personalInfo: false,
        hostIntent: false,
        documents: false,
        bankingInfo: false,
        emergencyContact: false,
        agreements: false
      }
    };

    // Create the application without validation for now
    // We'll validate when submitting
    application = new HostApplication(applicationData);

    // Save with validateBeforeSave: false to allow partial data
    await application.save({ validateBeforeSave: false });

    await application.populate('user', 'firstName lastName email');

    res.status(201).json({
      status: 'success',
      message: 'Host application created successfully',
      data: { application }
    });
  } catch (error) {
    // Handle duplicate application error
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a host application'
      });
    }
    next(error);
  }
};

// @desc    Get current user's application
// @route   GET /api/host-applications/my-application
// @access  Private
const getMyApplication = async (req, res, next) => {
  try {
    const application = await HostApplication.findOne({ user: req.user.id })
      .populate('user', 'firstName lastName email avatar')
      .populate('review.reviewedBy', 'firstName lastName');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'No application found. Please create one first.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application step
// @route   PUT /api/host-applications/:id/step/:stepName
// @access  Private
const updateApplicationStep = async (req, res, next) => {
  try {
    const { id, stepName } = req.params;
    const application = await HostApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Check ownership
    if (application.user.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this application'
      });
    }

    // Check if application is already approved
    if (application.status === 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update an approved application'
      });
    }

    // Update specific step data
    const stepData = req.body;

    switch (stepName) {
      case 'personalInfo':
        application.personalInfo = {
          ...application.personalInfo.toObject ? application.personalInfo.toObject() : application.personalInfo,
          ...stepData
        };
        // Validate required fields for this step
        if (stepData.phone && stepData.address?.city && stepData.dateOfBirth && stepData.nationalIdNumber) {
          application.stepsCompleted.personalInfo = true;
        }
        break;

      case 'hostIntent':
        application.hostIntent = {
          ...application.hostIntent.toObject ? application.hostIntent.toObject() : application.hostIntent,
          ...stepData
        };
        // Validate required fields for this step
        if (stepData.numberOfListings && stepData.experienceLevel &&
            (stepData.propertyTypes?.length > 0 || stepData.vehicleTypes?.length > 0)) {
          application.stepsCompleted.hostIntent = true;
        }
        break;

      case 'documents':
        application.documents = {
          ...application.documents.toObject ? application.documents.toObject() : application.documents,
          ...stepData
        };
        // Check if minimum documents are uploaded
        if (application.documents.nationalId?.front?.url &&
            application.documents.nationalId?.back?.url) {
          application.stepsCompleted.documents = true;
        }
        break;

      case 'bankingInfo':
        application.bankingInfo = {
          ...application.bankingInfo.toObject ? application.bankingInfo.toObject() : application.bankingInfo,
          ...stepData
        };
        // Validate required fields for this step
        if (stepData.bankName && stepData.accountHolderName &&
            stepData.accountNumber && stepData.rib) {
          application.stepsCompleted.bankingInfo = true;
        }
        break;

      case 'emergencyContact':
        application.emergencyContact = {
          ...application.emergencyContact.toObject ? application.emergencyContact.toObject() : application.emergencyContact,
          ...stepData
        };
        // Validate required fields for this step
        if (stepData.name && stepData.relationship && stepData.phone) {
          application.stepsCompleted.emergencyContact = true;
        }
        break;

      case 'agreements':
        application.agreements = {
          ...application.agreements.toObject ? application.agreements.toObject() : application.agreements,
          ...stepData,
          acceptedAt: stepData.termsAccepted && stepData.privacyAccepted && stepData.hostGuidelinesAccepted
            ? new Date() : application.agreements.acceptedAt
        };
        // Validate required fields for this step
        if (stepData.termsAccepted === true &&
            stepData.privacyAccepted === true &&
            stepData.hostGuidelinesAccepted === true) {
          application.stepsCompleted.agreements = true;
        }
        break;

      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid step name'
        });
    }

    // Save with partial validation
    await application.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: `${stepName} updated successfully`,
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit application for review
// @route   POST /api/host-applications/:id/submit
// @access  Private
const submitApplication = async (req, res, next) => {
  try {
    const application = await HostApplication.findById(req.params.id)
      .populate('user', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Check ownership
    if (application.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to submit this application'
      });
    }

    // Check if already submitted
    if (application.submittedAt) {
      return res.status(400).json({
        status: 'error',
        message: 'Application already submitted'
      });
    }

    // Check if all steps are completed
    if (!application.isComplete()) {
      return res.status(400).json({
        status: 'error',
        message: 'Please complete all steps before submitting',
        data: { stepsCompleted: application.stepsCompleted }
      });
    }

    // Validate all required fields before final submission
    const validationError = application.validateSync();
    if (validationError) {
      return res.status(400).json({
        status: 'error',
        message: 'Please fill in all required fields',
        errors: validationError.errors
      });
    }

    // Submit application
    await application.submit();

    // Send confirmation email
    try {
      await sendHostApplicationSubmitted(application.user, application);
    } catch (emailError) {
      console.error('Failed to send submission email:', emailError);
    }

    // Create in-app notification for user
    try {
      await Notification.createNotification({
        recipient: application.user._id,
        type: 'host_application_submitted',
        title: 'Host Application Submitted! 📝',
        message: `Hi ${application.user.firstName}! Your host application has been submitted successfully. Our team will review it and get back to you soon.`,
        data: {
          applicationId: application._id,
          submittedAt: application.submittedAt,
          status: application.status
        },
        link: '/dashboard/become-host',
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('Error creating host application submitted notification:', notificationError);
    }

    // Create in-app notification for all admins
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.createNotification({
          recipient: admin._id,
          type: 'host_application',
          title: 'New Host Application Received! 🏠',
          message: `${application.user.firstName} ${application.user.lastName} has submitted a new host application for review.`,
          data: {
            applicationId: application._id,
            userId: application.user._id,
            userName: `${application.user.firstName} ${application.user.lastName}`,
            submittedAt: application.submittedAt
          },
          link: `/dashboard/host-applications/${application._id}`,
          priority: 'high'
        });
      }
    } catch (notificationError) {
      console.error('Error creating admin notification for host application:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Application submitted successfully! We will review it and get back to you soon.',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload document
// @route   POST /api/host-applications/:id/documents/:documentType
// @access  Private
const uploadDocument = async (req, res, next) => {
  try {
    const { id, documentType } = req.params;
    const application = await HostApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Check ownership
    if (application.user.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to upload documents for this application'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Initialize documents object if it doesn't exist
    if (!application.documents) {
      application.documents = {};
    }

    // Update document URL based on type
    switch (documentType) {
      case 'nationalIdFront':
        if (!application.documents.nationalId) {
          application.documents.nationalId = {};
        }
        application.documents.nationalId.front = {
          url: fileUrl,
          uploadedAt: new Date()
        };
        break;

      case 'nationalIdBack':
        if (!application.documents.nationalId) {
          application.documents.nationalId = {};
        }
        application.documents.nationalId.back = {
          url: fileUrl,
          uploadedAt: new Date()
        };
        break;

      case 'proofOfAddress':
        application.documents.proofOfAddress = {
          url: fileUrl,
          uploadedAt: new Date()
        };
        break;

      case 'businessLicense':
        if (!application.documents.businessLicense) {
          application.documents.businessLicense = {};
        }
        application.documents.businessLicense.url = fileUrl;
        application.documents.businessLicense.uploadedAt = new Date();
        break;

      case 'taxDocument':
        if (!application.documents.taxId) {
          application.documents.taxId = {};
        }
        application.documents.taxId.document = {
          url: fileUrl,
          uploadedAt: new Date()
        };
        break;

      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid document type'
        });
    }

    // Check if minimum documents are uploaded to mark step as complete
    if (application.documents.nationalId?.front?.url &&
        application.documents.nationalId?.back?.url) {
      application.stepsCompleted.documents = true;
    }

    await application.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: {
        documentType,
        url: fileUrl,
        application
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===== ADMIN FUNCTIONS =====

// @desc    Get all host applications
// @route   GET /api/admin/host-applications
// @access  Private/Admin
const getAllApplications = async (req, res, next) => {
  try {
    const {
      status,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const applications = await HostApplication.find(query)
      .populate('user', 'firstName lastName email avatar phone')
      .populate('review.reviewedBy', 'firstName lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await HostApplication.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: applications.length,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        total: count,
        limit: parseInt(limit)
      },
      data: { applications }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single application (admin)
// @route   GET /api/admin/host-applications/:id
// @access  Private/Admin
const getApplication = async (req, res, next) => {
  try {
    const application = await HostApplication.findById(req.params.id)
      .populate('user', 'firstName lastName email avatar phone dateOfBirth')
      .populate('review.reviewedBy', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve host application
// @route   PUT /api/admin/host-applications/:id/approve
// @access  Private/Admin
const approveApplication = async (req, res, next) => {
  try {
    const application = await HostApplication.findById(req.params.id)
      .populate('user', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    if (application.status === 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Application is already approved'
      });
    }

    // Approve application and upgrade user to host
    await application.approve(req.user.id);

    // Send approval email
    try {
      await sendHostApplicationApproved(application.user, application);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    // Create in-app notification for user
    try {
      await Notification.createNotification({
        recipient: application.user._id,
        type: 'host_application_approved',
        title: 'Host Application Approved! 🎉',
        message: `Congratulations ${application.user.firstName}! Your host application has been approved. You can now start listing your properties and vehicles on Baytup!`,
        data: {
          applicationId: application._id,
          approvedAt: application.approvedAt,
          status: application.status
        },
        link: '/dashboard/my-listings',
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('Error creating host application approved notification:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Application approved successfully. User is now a host!',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject host application
// @route   PUT /api/admin/host-applications/:id/reject
// @access  Private/Admin
const rejectApplication = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
      });
    }

    const application = await HostApplication.findById(req.params.id)
      .populate('user', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Reject application
    await application.reject(req.user.id, reason);

    // Send rejection email
    try {
      await sendHostApplicationRejected(application.user, application, reason);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    // Create in-app notification for user
    try {
      await Notification.createNotification({
        recipient: application.user._id,
        type: 'host_application_rejected',
        title: 'Host Application Update ❌',
        message: `Hi ${application.user.firstName}, unfortunately your host application has been rejected. Reason: ${reason}. You can reapply after addressing the issues mentioned.`,
        data: {
          applicationId: application._id,
          rejectedAt: application.rejectedAt,
          status: application.status,
          reason: reason
        },
        link: '/dashboard/become-host',
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('Error creating host application rejected notification:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Application rejected',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request resubmission
// @route   PUT /api/admin/host-applications/:id/request-resubmission
// @access  Private/Admin
const requestResubmission = async (req, res, next) => {
  try {
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({
        status: 'error',
        message: 'Resubmission notes are required'
      });
    }

    const application = await HostApplication.findById(req.params.id)
      .populate('user', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Request resubmission
    await application.requestResubmission(req.user.id, notes);

    // Send resubmission email
    try {
      await sendHostApplicationResubmission(application.user, application, notes);
    } catch (emailError) {
      console.error('Failed to send resubmission email:', emailError);
    }

    // Create in-app notification for user
    try {
      await Notification.createNotification({
        recipient: application.user._id,
        type: 'host_application_resubmission',
        title: 'Host Application - Action Required 🔄',
        message: `Hi ${application.user.firstName}, we need some additional information for your host application. Please review our notes and resubmit: ${notes}`,
        data: {
          applicationId: application._id,
          status: application.status,
          notes: notes
        },
        link: '/dashboard/become-host',
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('Error creating host application resubmission notification:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Resubmission requested',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update host application (admin)
// @route   PUT /api/admin/host-applications/:id
// @access  Private/Admin
const updateApplication = async (req, res, next) => {
  try {
    const application = await HostApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Update personal info
    if (req.body.personalInfo) {
      application.personalInfo = {
        ...application.personalInfo.toObject ? application.personalInfo.toObject() : application.personalInfo,
        ...req.body.personalInfo
      };
    }

    // Update host intent
    if (req.body.hostIntent) {
      application.hostIntent = {
        ...application.hostIntent.toObject ? application.hostIntent.toObject() : application.hostIntent,
        ...req.body.hostIntent
      };
    }

    // Update banking info
    if (req.body.bankingInfo) {
      application.bankingInfo = {
        ...application.bankingInfo.toObject ? application.bankingInfo.toObject() : application.bankingInfo,
        ...req.body.bankingInfo
      };
    }

    // Update emergency contact
    if (req.body.emergencyContact) {
      application.emergencyContact = {
        ...application.emergencyContact.toObject ? application.emergencyContact.toObject() : application.emergencyContact,
        ...req.body.emergencyContact
      };
    }

    await application.save({ validateBeforeSave: false });

    await application.populate('user', 'firstName lastName email avatar phone');

    res.status(200).json({
      status: 'success',
      message: 'Application updated successfully',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application status (admin)
// @route   PUT /api/admin/host-applications/:id/status
// @access  Private/Admin
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'resubmission_required'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value'
      });
    }

    const application = await HostApplication.findById(req.params.id)
      .populate('user', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    const previousStatus = application.status;
    application.status = status;
    application.review.reviewedBy = req.user.id;
    application.review.reviewedAt = new Date();

    // Handle status-specific actions
    if (status === 'approved' && previousStatus !== 'approved') {
      // Upgrade user to host
      application.approvedAt = new Date();
      const User = require('../models/User');
      await User.findByIdAndUpdate(application.user._id, {
        role: 'host',
        'hostInfo.hostSince': new Date(),
        'hostInfo.verified': true
      });

      // Send approval email
      try {
        await sendHostApplicationApproved(application.user, application);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      // Create in-app notification for user
      try {
        await Notification.createNotification({
          recipient: application.user._id,
          type: 'host_application_approved',
          title: 'Host Application Approved! 🎉',
          message: `Congratulations ${application.user.firstName}! Your host application has been approved. You can now start listing your properties and vehicles on Baytup!`,
          data: {
            applicationId: application._id,
            approvedAt: application.approvedAt,
            status: application.status
          },
          link: '/dashboard/my-listings',
          priority: 'high'
        });
      } catch (notificationError) {
        console.error('Error creating host application approved notification:', notificationError);
      }
    } else if (status === 'rejected' && previousStatus !== 'rejected') {
      application.rejectedAt = new Date();
    } else if (status === 'under_review') {
      // Clear rejection/approval dates if moving back to under_review
      application.rejectedAt = undefined;
      application.approvedAt = undefined;
    }

    await application.save({ validateBeforeSave: false });

    await application.populate('user', 'firstName lastName email avatar phone');

    res.status(200).json({
      status: 'success',
      message: `Application status updated to ${status}${status === 'approved' ? '. User is now a host!' : ''}`,
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete host application
// @route   DELETE /api/admin/host-applications/:id
// @access  Private/Admin
const deleteApplication = async (req, res, next) => {
  try {
    const application = await HostApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Only allow deletion of rejected or pending applications
    if (application.status === 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete approved applications. Please reject first if needed.'
      });
    }

    await HostApplication.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Application deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApplication,
  getMyApplication,
  updateApplicationStep,
  submitApplication,
  uploadDocument,
  // Admin functions
  getAllApplications,
  getApplication,
  updateApplication,
  updateStatus,
  approveApplication,
  rejectApplication,
  requestResubmission,
  deleteApplication
};