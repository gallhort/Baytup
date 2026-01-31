const FAQ = require('../models/FAQ');
const { validationResult } = require('express-validator');

// @desc    Get all FAQs (public - published only)
// @route   GET /api/faq
// @access  Public
const getFAQs = async (req, res, next) => {
  try {
    const { category, audience, language = 'fr', featured, search } = req.query;

    // If search query provided
    if (search) {
      const faqs = await FAQ.search(search, language, audience || 'all');
      return res.status(200).json({
        status: 'success',
        count: faqs.length,
        data: faqs
      });
    }

    // Build query
    const query = { status: 'published' };

    if (category) {
      query.category = category;
    }

    if (audience && audience !== 'all') {
      query.$or = [
        { audience: 'all' },
        { audience }
      ];
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    const faqs = await FAQ.find(query)
      .sort({ category: 1, order: 1, viewCount: -1 })
      .select(`question answer category audience tags isFeatured viewCount helpful`);

    res.status(200).json({
      status: 'success',
      count: faqs.length,
      data: faqs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get FAQs grouped by category
// @route   GET /api/faq/grouped
// @access  Public
const getFAQsGrouped = async (req, res, next) => {
  try {
    const { audience, language = 'fr' } = req.query;

    const matchQuery = { status: 'published' };

    if (audience && audience !== 'all') {
      matchQuery.$or = [
        { audience: 'all' },
        { audience }
      ];
    }

    const faqs = await FAQ.aggregate([
      { $match: matchQuery },
      { $sort: { order: 1, viewCount: -1 } },
      {
        $group: {
          _id: '$category',
          faqs: {
            $push: {
              _id: '$_id',
              question: '$question',
              answer: '$answer',
              tags: '$tags',
              isFeatured: '$isFeatured',
              viewCount: '$viewCount',
              helpful: '$helpful'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Transform to object with category names
    const grouped = {};
    for (const item of faqs) {
      grouped[item._id] = {
        faqs: item.faqs,
        count: item.count
      };
    }

    res.status(200).json({
      status: 'success',
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured FAQs
// @route   GET /api/faq/featured
// @access  Public
const getFeaturedFAQs = async (req, res, next) => {
  try {
    const { language = 'fr', limit = 5 } = req.query;

    const faqs = await FAQ.getFeatured(language, parseInt(limit));

    res.status(200).json({
      status: 'success',
      count: faqs.length,
      data: faqs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single FAQ
// @route   GET /api/faq/:id
// @access  Public
const getFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findById(req.params.id)
      .populate('relatedFAQs', 'question category');

    if (!faq) {
      return res.status(404).json({
        status: 'error',
        message: 'FAQ not found'
      });
    }

    // Increment view count
    await faq.incrementView();

    res.status(200).json({
      status: 'success',
      data: faq
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Vote FAQ helpful
// @route   POST /api/faq/:id/vote
// @access  Public
const voteFAQ = async (req, res, next) => {
  try {
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a helpful vote (true or false)'
      });
    }

    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        status: 'error',
        message: 'FAQ not found'
      });
    }

    await faq.voteHelpful(helpful);

    res.status(200).json({
      status: 'success',
      message: 'Vote recorded',
      data: {
        helpful: faq.helpful,
        helpfulnessScore: faq.helpfulnessScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get FAQ categories
// @route   GET /api/faq/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await FAQ.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Category labels in French
    const categoryLabels = {
      general: 'Questions générales',
      booking: 'Réservations',
      payment: 'Paiements',
      cancellation: 'Annulations',
      host: 'Hôtes',
      guest: 'Voyageurs',
      account: 'Compte et profil',
      security: 'Sécurité',
      listing: 'Annonces',
      reviews: 'Avis',
      support: 'Support',
      legal: 'Légal / CGU'
    };

    const result = categories.map(cat => ({
      id: cat._id,
      label: categoryLabels[cat._id] || cat._id,
      count: cat.count
    }));

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN ROUTES ====================

// @desc    Get all FAQs (admin - all statuses)
// @route   GET /api/admin/faq
// @access  Private/Admin
const adminGetFAQs = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [faqs, total] = await Promise.all([
      FAQ.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .sort({ category: 1, order: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FAQ.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      count: faqs.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      page: parseInt(page),
      data: faqs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create FAQ
// @route   POST /api/admin/faq
// @access  Private/Admin
const createFAQ = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const {
      question,
      answer,
      category,
      audience,
      tags,
      status,
      order,
      isFeatured,
      relatedFAQs
    } = req.body;

    const faq = await FAQ.create({
      question,
      answer,
      category,
      audience,
      tags,
      status: status || 'draft',
      order: order || 0,
      isFeatured: isFeatured || false,
      relatedFAQs,
      createdBy: req.user.id
    });

    res.status(201).json({
      status: 'success',
      data: faq
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update FAQ
// @route   PUT /api/admin/faq/:id
// @access  Private/Admin
const updateFAQ = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        status: 'error',
        message: 'FAQ not found'
      });
    }

    const {
      question,
      answer,
      category,
      audience,
      tags,
      status,
      order,
      isFeatured,
      relatedFAQs
    } = req.body;

    // Update fields
    if (question) faq.question = question;
    if (answer) faq.answer = answer;
    if (category) faq.category = category;
    if (audience) faq.audience = audience;
    if (tags) faq.tags = tags;
    if (status) faq.status = status;
    if (typeof order === 'number') faq.order = order;
    if (typeof isFeatured === 'boolean') faq.isFeatured = isFeatured;
    if (relatedFAQs) faq.relatedFAQs = relatedFAQs;

    faq.updatedBy = req.user.id;

    await faq.save();

    res.status(200).json({
      status: 'success',
      data: faq
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/admin/faq/:id
// @access  Private/Admin
const deleteFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        status: 'error',
        message: 'FAQ not found'
      });
    }

    await FAQ.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update FAQ order
// @route   PUT /api/admin/faq/reorder
// @access  Private/Admin
const reorderFAQs = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of { id, order }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        status: 'error',
        message: 'Items must be an array'
      });
    }

    const bulkOps = items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order: item.order, updatedBy: req.user.id } }
      }
    }));

    await FAQ.bulkWrite(bulkOps);

    res.status(200).json({
      status: 'success',
      message: 'FAQs reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get FAQ statistics
// @route   GET /api/admin/faq/stats
// @access  Private/Admin
const getFAQStats = async (req, res, next) => {
  try {
    const [
      totalCount,
      publishedCount,
      draftCount,
      categoryStats,
      topViewed,
      lowHelpfulness
    ] = await Promise.all([
      FAQ.countDocuments(),
      FAQ.countDocuments({ status: 'published' }),
      FAQ.countDocuments({ status: 'draft' }),
      FAQ.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      FAQ.find({ status: 'published' })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('question.fr viewCount category'),
      FAQ.aggregate([
        { $match: { status: 'published', 'helpful.no': { $gt: 0 } } },
        {
          $addFields: {
            helpfulnessScore: {
              $cond: {
                if: { $eq: [{ $add: ['$helpful.yes', '$helpful.no'] }, 0] },
                then: 100,
                else: {
                  $multiply: [
                    { $divide: ['$helpful.yes', { $add: ['$helpful.yes', '$helpful.no'] }] },
                    100
                  ]
                }
              }
            }
          }
        },
        { $match: { helpfulnessScore: { $lt: 50 } } },
        { $sort: { helpfulnessScore: 1 } },
        { $limit: 5 },
        { $project: { question: '$question.fr', helpfulnessScore: 1, helpful: 1, category: 1 } }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        total: totalCount,
        published: publishedCount,
        draft: draftCount,
        archived: totalCount - publishedCount - draftCount,
        byCategory: categoryStats,
        topViewed,
        lowHelpfulness
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Public routes
  getFAQs,
  getFAQsGrouped,
  getFeaturedFAQs,
  getFAQ,
  voteFAQ,
  getCategories,
  // Admin routes
  adminGetFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  reorderFAQs,
  getFAQStats
};
