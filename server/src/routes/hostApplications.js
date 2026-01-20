const express = require('express');
const {
  createApplication,
  getMyApplication,
  updateApplicationStep,
  submitApplication,
  uploadDocument
} = require('../controllers/hostApplicationController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   POST /api/host-applications
// @desc    Create or get host application
// @access  Private
router.post('/', createApplication);

// @route   GET /api/host-applications/my-application
// @desc    Get current user's application
// @access  Private
router.get('/my-application', getMyApplication);

// @route   PUT /api/host-applications/:id/step/:stepName
// @desc    Update application step
// @access  Private
router.put('/:id/step/:stepName', updateApplicationStep);

// @route   POST /api/host-applications/:id/submit
// @desc    Submit application for review
// @access  Private
router.post('/:id/submit', submitApplication);

// @route   POST /api/host-applications/:id/documents/:documentType
// @desc    Upload document
// @access  Private
router.post('/:id/documents/:documentType', upload.single('document'), uploadDocument);

module.exports = router;
