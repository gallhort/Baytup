const mongoose = require('mongoose');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const Booking = require('../src/models/Booking');
const Review = require('../src/models/Review');
const Notification = require('../src/models/Notification');
const { Conversation, Message } = require('../src/models/Message');
const Payout = require('../src/models/Payout');
const HostApplication = require('../src/models/HostApplication');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// Admin user (as requested)
const adminUser = {
  firstName: 'Admin',
  lastName: 'Baytup',
  email: 'contact@baytup.fr',
  password: 'Testpass1!',
  phone: '+213777888999',
  role: 'admin',
  avatar: '/uploads/users/default-avatar.png',
  bio: 'Platform administrator with full access to manage the Baytup ecosystem.',
  dateOfBirth: new Date('1985-05-15'),
  gender: 'male',
  address: {
    street: '123 Administrative Avenue',
    city: 'Algiers',
    state: 'Algiers Province',
    postalCode: '16000',
    country: 'Algeria'
  },
  location: {
    type: 'Point',
    coordinates: [3.0588, 36.7753]
  },
  language: 'en',
  currency: 'DZD',
  theme: 'light',
  isEmailVerified: true,
  stats: {
    totalBookings: 0,
    totalListings: 0,
    totalReviews: 0,
    averageRating: 0,
    totalEarnings: 0
  },
  notifications: {
    email: {
      bookingUpdates: true,
      messages: true,
      promotions: true,
      newsletter: true
    },
    push: {
      bookingUpdates: true,
      messages: true,
      promotions: false
    }
  },
  privacy: {
    showEmail: false,
    showPhone: false,
    profileVisibility: 'public'
  },
  isActive: true,
  isBlocked: false,
  lastLogin: new Date(),
  lastActive: new Date()
};

// Host user (as requested)
const hostUser = {
  firstName: 'Karim',
  lastName: 'Benali',
  email: 'karim.host@baytup.fr',
  password: 'Testpass1!',
  phone: '+213551234567',
  role: 'host',
  avatar: '/uploads/users/default-avatar.png',
  bio: 'Passionate host dedicated to providing exceptional stays and experiences in Algeria. I love meeting travelers from around the world and sharing the beauty of our country.',
  dateOfBirth: new Date('1988-03-20'),
  gender: 'male',
  address: {
    street: '456 Host Street',
    city: 'Algiers',
    state: 'Algiers Province',
    postalCode: '16000',
    country: 'Algeria'
  },
  location: {
    type: 'Point',
    coordinates: [3.0588, 36.7753]
  },
  language: 'fr',
  currency: 'DZD',
  theme: 'light',
  isEmailVerified: true,
  hostInfo: {
    isHost: true,
    hostSince: new Date('2023-01-15'),
    responseRate: 98,
    responseTime: 2,
    superhost: true,
    verifications: {
      identity: true,
      email: true,
      phone: true,
      government: true
    }
  },
  bankAccount: {
    bankName: 'BNA Bank',
    accountHolderName: 'Karim Benali',
    accountNumber: '0012345678901234567',
    rib: '00123456789012345678',
    iban: 'DZ12 0001 2345 6789 0123 4567',
    swiftCode: 'BNADZD01',
    isVerified: true,
    verifiedAt: new Date('2023-02-01')
  },
  stats: {
    totalBookings: 0,
    totalListings: 2,
    totalReviews: 2,
    averageRating: 4.5,
    totalEarnings: 0
  },
  notifications: {
    email: {
      bookingUpdates: true,
      messages: true,
      promotions: true,
      newsletter: true
    },
    push: {
      bookingUpdates: true,
      messages: true,
      promotions: true
    }
  },
  privacy: {
    showEmail: false,
    showPhone: true,
    profileVisibility: 'public'
  },
  isActive: true,
  isBlocked: false,
  lastLogin: new Date(),
  lastActive: new Date()
};

// Guest user (as requested)
const guestUser = {
  firstName: 'Sarah',
  lastName: 'Dubois',
  email: 'sarah.guest@baytup.fr',
  password: 'Testpass1!',
  phone: '+213661234567',
  role: 'guest',
  avatar: '/uploads/users/default-avatar.png',
  bio: 'Travel enthusiast exploring the beautiful landscapes and culture of Algeria.',
  dateOfBirth: new Date('1992-07-10'),
  gender: 'female',
  address: {
    street: '789 Guest Avenue',
    city: 'Oran',
    state: 'Oran Province',
    postalCode: '31000',
    country: 'Algeria'
  },
  location: {
    type: 'Point',
    coordinates: [-0.6337, 35.6976]
  },
  language: 'en',
  currency: 'DZD',
  theme: 'light',
  isEmailVerified: true,
  stats: {
    totalBookings: 2,
    totalListings: 0,
    totalReviews: 2,
    averageRating: 5.0,
    totalEarnings: 0
  },
  notifications: {
    email: {
      bookingUpdates: true,
      messages: true,
      promotions: true,
      newsletter: true
    },
    push: {
      bookingUpdates: true,
      messages: true,
      promotions: false
    }
  },
  privacy: {
    showEmail: false,
    showPhone: false,
    profileVisibility: 'public'
  },
  isActive: true,
  isBlocked: false,
  lastLogin: new Date(),
  lastActive: new Date()
};

// Listings data - 2 listings (1 stay + 1 vehicle) for the host
const listingsData = [
  // Listing 1: Stay
  {
    title: 'Modern Apartment with Mediterranean View',
    description: 'Stunning 2-bedroom apartment in the heart of Algiers with breathtaking Mediterranean Sea views. Recently renovated with modern amenities, fully equipped kitchen, spacious living area, and a beautiful balcony. Perfect location near restaurants, cafes, and public transportation. Ideal for couples or small families exploring Algiers.',
    category: 'stay',
    subcategory: 'apartment',
    address: {
      street: '15 Boulevard Mohamed V',
      city: 'Algiers',
      state: 'Algiers Province',
      postalCode: '16000',
      country: 'Algeria'
    },
    location: {
      type: 'Point',
      coordinates: [3.0588, 36.7538]
    },
    stayDetails: {
      stayType: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      area: 90,
      floor: 5,
      furnished: 'furnished',
      amenities: ['wifi', 'ac', 'kitchen', 'balcony', 'tv', 'washer', 'elevator', 'parking']
    },
    vehicleDetails: {
      features: []
    },
    pricing: {
      basePrice: 9500,
      currency: 'DZD',
      pricingType: 'per_night',
      cleaningFee: 2000,
      serviceFee: 1500,
      securityDeposit: 10000
    },
    availability: {
      instantBook: true,
      minStay: 2,
      maxStay: 30,
      advanceNotice: 1,
      preparationTime: 2,
      checkInFrom: '15:00',
      checkInTo: '21:00',
      checkOutBefore: '11:00'
    },
    rules: {
      smoking: 'not_allowed',
      pets: 'not_allowed',
      parties: 'not_allowed',
      children: 'allowed',
      additionalRules: ['Quiet hours: 22:00-08:00', 'Maximum 4 guests', 'Please remove shoes at entrance']
    },
    images: [
      { url: '/uploads/listings/apartment1.jpg', caption: 'Living room with sea view', isPrimary: true },
      { url: '/uploads/listings/apartment2.jpg', caption: 'Modern kitchen', isPrimary: false },
      { url: '/uploads/listings/apartment3.jpg', caption: 'Master bedroom', isPrimary: false },
      { url: '/uploads/listings/apartment4.jpg', caption: 'Bathroom', isPrimary: false },
      { url: '/uploads/listings/apartment5.jpg', caption: 'Balcony view', isPrimary: false }
    ],
    status: 'active',
    featured: true,
    featuredUntil: new Date('2026-12-31'),
    blockedDates: [],
    stats: {
      views: 245,
      favorites: 32,
      bookings: 2,
      totalRevenue: 0,
      averageRating: 0,
      reviewCount: 0
    }
  },
  // Listing 2: Vehicle
  {
    title: 'Reliable Toyota Corolla 2022 - City & Highway',
    description: 'Well-maintained Toyota Corolla 2022 perfect for exploring Algeria. This reliable sedan offers excellent fuel economy, comfortable seating for 5 passengers, and modern safety features. Equipped with GPS navigation, Bluetooth connectivity, air conditioning, and backup camera. Ideal for city tours and long-distance travel across Algeria.',
    category: 'vehicle',
    subcategory: 'car',
    address: {
      street: '20 Airport Road',
      city: 'Algiers',
      state: 'Algiers Province',
      postalCode: '16000',
      country: 'Algeria'
    },
    location: {
      type: 'Point',
      coordinates: [3.0588, 36.7538]
    },
    stayDetails: {
      amenities: []
    },
    vehicleDetails: {
      vehicleType: 'car',
      make: 'Toyota',
      model: 'Corolla',
      year: 2022,
      transmission: 'automatic',
      fuelType: 'gasoline',
      seats: 5,
      features: ['gps', 'bluetooth', 'ac', 'backup_camera', 'cruise_control']
    },
    pricing: {
      basePrice: 5500,
      currency: 'DZD',
      pricingType: 'per_day',
      cleaningFee: 1000,
      serviceFee: 500,
      securityDeposit: 25000
    },
    availability: {
      instantBook: true,
      minStay: 1,
      maxStay: 30,
      advanceNotice: 0,
      preparationTime: 1,
      checkInFrom: '08:00',
      checkInTo: '20:00',
      checkOutBefore: '20:00'
    },
    rules: {
      smoking: 'not_allowed',
      pets: 'not_allowed',
      parties: 'not_allowed',
      children: 'allowed',
      additionalRules: [
        'Valid driving license required',
        'Minimum age 25 years',
        'No smoking inside vehicle',
        'Fuel policy: Return with same level',
        'Maximum 300km per day (extra charges apply beyond)',
        'Comprehensive insurance included'
      ]
    },
    images: [
      { url: '/uploads/listings/car1.jpg', caption: 'Toyota Corolla 2022', isPrimary: true },
      { url: '/uploads/listings/car2.jpg', caption: 'Interior dashboard', isPrimary: false },
      { url: '/uploads/listings/car3.jpg', caption: 'Comfortable seating', isPrimary: false },
      { url: '/uploads/listings/car4.jpg', caption: 'Trunk space', isPrimary: false }
    ],
    status: 'active',
    featured: false,
    featuredUntil: null,
    blockedDates: [],
    stats: {
      views: 178,
      favorites: 24,
      bookings: 2,
      totalRevenue: 0,
      averageRating: 0,
      reviewCount: 0
    }
  }
];

// Seed function
const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Listing.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    await Notification.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Payout.deleteMany({});
    await HostApplication.deleteMany({});

    // Create users
    console.log('👤 Creating users...');
    const admin = await User.create(adminUser);
    console.log(`✅ Admin created: ${admin.email}`);

    const host = await User.create(hostUser);
    console.log(`✅ Host created: ${host.email}`);

    const guest = await User.create(guestUser);
    console.log(`✅ Guest created: ${guest.email}`);

    // Create listings for host
    console.log('🏠 Creating listings...');
    listingsData[0].host = host._id;
    listingsData[1].host = host._id;

    const listings = await Listing.create(listingsData);
    console.log(`✅ ${listings.length} listings created`);

    const stayListing = listings[0];
    const vehicleListing = listings[1];

    // Create bookings (2 bookings total - 1 for stay, 1 for vehicle)
    console.log('📅 Creating bookings...');

    // Booking 1: Stay - Completed with review
    const booking1StartDate = new Date();
    booking1StartDate.setDate(booking1StartDate.getDate() - 15); // 15 days ago
    const booking1EndDate = new Date(booking1StartDate);
    booking1EndDate.setDate(booking1EndDate.getDate() + 3); // 3 nights

    const booking1 = new Booking({
      listing: stayListing._id,
      guest: guest._id,
      host: host._id,
      startDate: booking1StartDate,
      endDate: booking1EndDate,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      guestCount: {
        adults: 2,
        children: 0,
        infants: 0
      },
      pricing: {
        basePrice: 9500,
        nights: 3,
        subtotal: 28500,
        cleaningFee: 2000,
        serviceFee: 1425,
        taxes: 6066,
        totalAmount: 37991,
        currency: 'DZD',
        securityDeposit: 10000
      },
      payment: {
        method: 'slickpay',
        status: 'paid',
        transactionId: 'TXN_' + Date.now() + '_001',
        paidAmount: 37991,
        paidAt: booking1StartDate,
        refundAmount: 0
      },
      status: 'completed',
      specialRequests: 'We would like a late check-in at 19:00 if possible.',
      hostMessage: 'Welcome! Late check-in is no problem. I\'ll meet you at 19:00.',
      checkIn: {
        actualTime: new Date(booking1StartDate.getTime() + 19 * 60 * 60 * 1000),
        confirmedBy: guest._id,
        notes: 'Smooth check-in. Host was very welcoming.'
      },
      checkOut: {
        actualTime: booking1EndDate,
        confirmedBy: host._id,
        notes: 'Apartment left in excellent condition. Great guests!',
        damageReport: 'None'
      },
      completion: {
        hostConfirmed: true,
        hostConfirmedAt: booking1EndDate,
        guestConfirmed: true,
        guestConfirmedAt: booking1EndDate,
        completedAt: booking1EndDate
      },
      remindersSent: {
        paymentReminder: false,
        checkInReminder: true,
        checkOutReminder: true,
        reviewReminder: true
      }
    });
    booking1._skipDateValidation = true;
    await booking1.save();
    console.log(`✅ Booking 1 created (Stay - Completed)`);

    // Booking 2: Vehicle - Completed with review
    const booking2StartDate = new Date();
    booking2StartDate.setDate(booking2StartDate.getDate() - 8); // 8 days ago
    const booking2EndDate = new Date(booking2StartDate);
    booking2EndDate.setDate(booking2EndDate.getDate() + 2); // 2 days

    const booking2 = new Booking({
      listing: vehicleListing._id,
      guest: guest._id,
      host: host._id,
      startDate: booking2StartDate,
      endDate: booking2EndDate,
      checkInTime: '08:00',
      checkOutTime: '20:00',
      guestCount: {
        adults: 2,
        children: 0,
        infants: 0
      },
      pricing: {
        basePrice: 5500,
        nights: 2,
        subtotal: 11000,
        cleaningFee: 1000,
        serviceFee: 550,
        taxes: 2384,
        totalAmount: 14934,
        currency: 'DZD',
        securityDeposit: 25000
      },
      payment: {
        method: 'slickpay',
        status: 'paid',
        transactionId: 'TXN_' + Date.now() + '_002',
        paidAmount: 14934,
        paidAt: booking2StartDate,
        refundAmount: 0
      },
      status: 'completed',
      specialRequests: 'Need GPS navigation for desert trip.',
      hostMessage: 'GPS is included! I\'ll also provide you with offline maps and emergency contacts.',
      checkIn: {
        actualTime: new Date(booking2StartDate.getTime() + 8 * 60 * 60 * 1000),
        confirmedBy: guest._id,
        notes: 'Car in perfect condition. GPS works great.'
      },
      checkOut: {
        actualTime: booking2EndDate,
        confirmedBy: host._id,
        notes: 'Vehicle returned clean and in good condition.',
        damageReport: 'None'
      },
      completion: {
        hostConfirmed: true,
        hostConfirmedAt: booking2EndDate,
        guestConfirmed: true,
        guestConfirmedAt: booking2EndDate,
        completedAt: booking2EndDate
      },
      remindersSent: {
        paymentReminder: false,
        checkInReminder: true,
        checkOutReminder: true,
        reviewReminder: true
      }
    });
    booking2._skipDateValidation = true;
    await booking2.save();
    console.log(`✅ Booking 2 created (Vehicle - Completed)`);

    // Create reviews (2 reviews - 1 for each booking)
    console.log('⭐ Creating reviews...');

    // Review 1: Guest review for stay booking
    const review1 = await Review.create({
      listing: stayListing._id,
      booking: booking1._id,
      reviewer: guest._id,
      reviewee: host._id,
      type: 'guest_to_host',
      rating: {
        overall: 5,
        cleanliness: 5,
        communication: 5,
        checkIn: 5,
        accuracy: 5,
        location: 5,
        value: 5
      },
      title: 'Perfect stay in Algiers!',
      comment: 'Amazing apartment with spectacular views! Karim was an excellent host - very responsive and helpful. The apartment was spotlessly clean, exactly as described, and the location was perfect for exploring the city. The balcony views of the Mediterranean were breathtaking. Would definitely recommend and book again!',
      photos: [],
      status: 'published',
      isPublic: true,
      publishedAt: new Date(),
      language: 'en'
    });
    console.log(`✅ Review 1 created (Guest → Host for Stay)`);

    // Review 2: Host review for guest from stay booking
    const review2 = await Review.create({
      listing: stayListing._id,
      booking: booking1._id,
      reviewer: host._id,
      reviewee: guest._id,
      type: 'host_to_guest',
      rating: {
        overall: 5,
        cleanliness: 5,
        communication: 5,
        checkIn: 5,
        accuracy: 5,
        location: 5,
        value: 5
      },
      title: 'Excellent guests!',
      comment: 'Sarah and her partner were wonderful guests! Very respectful of the apartment and the rules. Great communication throughout their stay. Left the apartment in perfect condition. Would be happy to host them again anytime!',
      photos: [],
      status: 'published',
      isPublic: true,
      publishedAt: new Date(),
      language: 'en'
    });
    console.log(`✅ Review 2 created (Host → Guest for Stay)`);

    // Review 3: Guest review for vehicle booking
    const review3 = await Review.create({
      listing: vehicleListing._id,
      booking: booking2._id,
      reviewer: guest._id,
      reviewee: host._id,
      type: 'guest_to_host',
      rating: {
        overall: 4,
        cleanliness: 4,
        communication: 5,
        checkIn: 5,
        accuracy: 4,
        location: 5,
        value: 4
      },
      title: 'Great car for road trip',
      comment: 'The Toyota Corolla was perfect for our road trip around Algeria. Clean, comfortable, and reliable. Karim provided excellent instructions and was very helpful with route suggestions. GPS worked perfectly. Only minor issue was a small scratch on the bumper that was already there. Overall great experience!',
      photos: [],
      status: 'published',
      isPublic: true,
      publishedAt: new Date(),
      language: 'en'
    });
    console.log(`✅ Review 3 created (Guest → Host for Vehicle)`);

    // Review 4: Host review for guest from vehicle booking
    const review4 = await Review.create({
      listing: vehicleListing._id,
      booking: booking2._id,
      reviewer: host._id,
      reviewee: guest._id,
      type: 'host_to_guest',
      rating: {
        overall: 5,
        cleanliness: 5,
        communication: 5,
        checkIn: 5,
        accuracy: 5,
        location: 5,
        value: 5
      },
      title: 'Responsible renters',
      comment: 'Sarah was very responsible with the vehicle. Returned it clean and on time. Good communication throughout. Highly recommended guest!',
      photos: [],
      status: 'published',
      isPublic: true,
      publishedAt: new Date(),
      language: 'en'
    });
    console.log(`✅ Review 4 created (Host → Guest for Vehicle)`);

    // Update booking references to reviews
    booking1.guestReview = review1._id;
    booking1.hostReview = review2._id;
    await booking1.save();

    booking2.guestReview = review3._id;
    booking2.hostReview = review4._id;
    await booking2.save();

    // Create notifications for users
    console.log('🔔 Creating notifications...');

    await Notification.create([
      {
        recipient: host._id,
        sender: guest._id,
        type: 'booking_completed',
        title: 'Booking Completed',
        message: `Your booking with Sarah Dubois has been completed successfully.`,
        data: { bookingId: booking1._id },
        link: `/dashboard/bookings/${booking1._id}`,
        isRead: false,
        priority: 'normal'
      },
      {
        recipient: host._id,
        sender: guest._id,
        type: 'review_received',
        title: 'New Review Received',
        message: `Sarah Dubois left you a 5-star review!`,
        data: { reviewId: review1._id },
        link: `/dashboard/reviews`,
        isRead: false,
        priority: 'normal'
      },
      {
        recipient: guest._id,
        sender: host._id,
        type: 'booking_completed',
        title: 'Booking Completed',
        message: `Your booking at "${stayListing.title}" has been completed.`,
        data: { bookingId: booking1._id },
        link: `/dashboard/bookings/${booking1._id}`,
        isRead: false,
        priority: 'normal'
      },
      {
        recipient: guest._id,
        sender: host._id,
        type: 'review_received',
        title: 'New Review Received',
        message: `Karim Benali left you a review!`,
        data: { reviewId: review2._id },
        link: `/dashboard/reviews`,
        isRead: false,
        priority: 'normal'
      }
    ]);
    console.log(`✅ Notifications created`);

    // Create conversation and messages
    console.log('💬 Creating conversations and messages...');

    const conversation = await Conversation.create({
      participants: [
        { user: guest._id, lastReadAt: new Date() },
        { user: host._id, lastReadAt: new Date() }
      ],
      listing: stayListing._id,
      booking: booking1._id,
      type: 'booking',
      subject: 'Booking inquiry for Modern Apartment',
      lastMessage: {
        content: 'Thank you for the wonderful stay!',
        sender: guest._id,
        sentAt: new Date(),
        type: 'text'
      },
      status: 'active',
      messageCount: 3,
      priority: 'normal'
    });

    await Message.create([
      {
        conversation: conversation._id,
        sender: guest._id,
        content: 'Hi Karim! I\'m interested in booking your apartment for 3 nights. Is late check-in possible?',
        type: 'text',
        readBy: [
          { user: host._id, readAt: new Date() }
        ],
        status: 'read',
        language: 'en'
      },
      {
        conversation: conversation._id,
        sender: host._id,
        content: 'Hello Sarah! Yes, late check-in is absolutely fine. I can meet you anytime until 21:00. Looking forward to hosting you!',
        type: 'text',
        readBy: [
          { user: guest._id, readAt: new Date() }
        ],
        status: 'read',
        language: 'en'
      },
      {
        conversation: conversation._id,
        sender: guest._id,
        content: 'Thank you for the wonderful stay! The apartment was perfect!',
        type: 'text',
        readBy: [
          { user: host._id, readAt: new Date() }
        ],
        status: 'read',
        language: 'en'
      }
    ]);
    console.log(`✅ Conversation and messages created`);

    // Create a payout request for host
    console.log('💰 Creating payout...');

    await Payout.create({
      host: host._id,
      amount: 50000,
      currency: 'DZD',
      bankAccount: {
        bankName: 'BNA Bank',
        accountHolderName: 'Karim Benali',
        accountNumber: '0012345678901234567',
        rib: '00123456789012345678',
        iban: 'DZ12 0001 2345 6789 0123 4567',
        swiftCode: 'BNADZD01'
      },
      status: 'pending',
      paymentMethod: 'bank_transfer',
      hostNotes: 'Please process earnings from recent bookings.',
      platformFee: 2500,
      processingFee: 500,
      finalAmount: 47000,
      requestedAt: new Date(),
      notifications: {
        hostNotified: true,
        adminNotified: true,
        completionNotified: false
      }
    });
    console.log(`✅ Payout request created`);

    // Create host application for the host
    console.log('📝 Creating host application...');

    await HostApplication.create({
      user: host._id,
      status: 'approved',
      personalInfo: {
        phone: '+213551234567',
        address: {
          street: '456 Host Street',
          city: 'Algiers',
          state: 'Algiers Province',
          postalCode: '16000',
          country: 'Algeria'
        },
        dateOfBirth: new Date('1988-03-20'),
        nationalIdNumber: '12345678901234567'
      },
      hostIntent: {
        propertyTypes: ['apartment'],
        vehicleTypes: ['car'],
        numberOfListings: 2,
        experienceLevel: 'experienced',
        motivation: 'I want to share the beauty of Algeria with travelers from around the world and provide exceptional hospitality.'
      },
      documents: {
        nationalId: {
          front: { url: '/uploads/documents/host-id-front.jpg', uploadedAt: new Date() },
          back: { url: '/uploads/documents/host-id-back.jpg', uploadedAt: new Date() },
          verified: true
        },
        proofOfAddress: {
          url: '/uploads/documents/host-address-proof.pdf',
          uploadedAt: new Date(),
          verified: true
        },
        businessLicense: {
          required: false
        },
        taxId: {
          number: 'TAX123456789',
          document: { url: '/uploads/documents/host-tax-id.pdf', uploadedAt: new Date() },
          verified: true
        }
      },
      bankingInfo: {
        bankName: 'BNA Bank',
        accountHolderName: 'Karim Benali',
        accountNumber: '0012345678901234567',
        rib: '00123456789012345678',
        swift: 'BNADZD01',
        verified: true
      },
      emergencyContact: {
        name: 'Fatima Benali',
        relationship: 'Sister',
        phone: '+213771234567'
      },
      agreements: {
        termsAccepted: true,
        privacyAccepted: true,
        hostGuidelinesAccepted: true,
        acceptedAt: new Date('2023-01-10')
      },
      review: {
        reviewedBy: admin._id,
        reviewedAt: new Date('2023-01-15'),
        notes: 'Excellent application. All documents verified. Approved for hosting.'
      },
      stepsCompleted: {
        personalInfo: true,
        hostIntent: true,
        documents: true,
        bankingInfo: true,
        emergencyContact: true,
        agreements: true
      },
      submittedAt: new Date('2023-01-12'),
      approvedAt: new Date('2023-01-15')
    });
    console.log(`✅ Host application created`);

    // Update listing and user statistics
    console.log('📊 Updating statistics...');

    // Update listing stats
    stayListing.stats.bookings = 1;
    stayListing.stats.reviewCount = 1;
    stayListing.stats.averageRating = 5.0;
    stayListing.stats.totalRevenue = 37991;
    await stayListing.save();

    vehicleListing.stats.bookings = 1;
    vehicleListing.stats.reviewCount = 1;
    vehicleListing.stats.averageRating = 4.0;
    vehicleListing.stats.totalRevenue = 14934;
    await vehicleListing.save();

    // Update user stats
    host.stats.totalBookings = 2;
    host.stats.totalReviews = 2;
    host.stats.averageRating = 4.5;
    host.stats.totalEarnings = 52925; // Total from both bookings
    await host.save();

    guest.stats.totalBookings = 2;
    guest.stats.totalReviews = 2;
    guest.stats.averageRating = 5.0;
    await guest.save();

    console.log(`✅ Statistics updated`);

    // Display summary
    console.log('\n🎉 Database seeded successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 SEED SUMMARY:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n👥 USERS (3 total):`);
    console.log(`   🔑 Admin: ${admin.email}`);
    console.log(`      Password: Testpass1!`);
    console.log(`      Role: admin`);
    console.log(`\n   🏠 Host: ${host.email}`);
    console.log(`      Password: Testpass1!`);
    console.log(`      Role: host`);
    console.log(`      Superhost: Yes`);
    console.log(`      Total Earnings: ${host.stats.totalEarnings} DZD`);
    console.log(`\n   👤 Guest: ${guest.email}`);
    console.log(`      Password: Testpass1!`);
    console.log(`      Role: guest`);
    console.log(`      Total Bookings: ${guest.stats.totalBookings}`);
    console.log(`\n🏡 LISTINGS (2 total):`);
    console.log(`   1. ${stayListing.title}`);
    console.log(`      Category: Stay (Apartment)`);
    console.log(`      Price: ${stayListing.pricing.basePrice} DZD/night`);
    console.log(`      Featured: Yes`);
    console.log(`      Reviews: ${stayListing.stats.reviewCount} (${stayListing.stats.averageRating}★)`);
    console.log(`\n   2. ${vehicleListing.title}`);
    console.log(`      Category: Vehicle (Car)`);
    console.log(`      Price: ${vehicleListing.pricing.basePrice} DZD/day`);
    console.log(`      Featured: No`);
    console.log(`      Reviews: ${vehicleListing.stats.reviewCount} (${vehicleListing.stats.averageRating}★)`);
    console.log(`\n📅 BOOKINGS (2 total):`);
    console.log(`   1. Stay Booking: ${booking1.pricing.nights} nights`);
    console.log(`      Status: Completed`);
    console.log(`      Total: ${booking1.pricing.totalAmount} DZD`);
    console.log(`      Payment: Paid via SlickPay`);
    console.log(`\n   2. Vehicle Booking: ${booking2.pricing.nights} days`);
    console.log(`      Status: Completed`);
    console.log(`      Total: ${booking2.pricing.totalAmount} DZD`);
    console.log(`      Payment: Paid via SlickPay`);
    console.log(`\n⭐ REVIEWS (4 total):`);
    console.log(`   • Guest → Host (Stay): 5.0★`);
    console.log(`   • Host → Guest (Stay): 5.0★`);
    console.log(`   • Guest → Host (Vehicle): 4.0★`);
    console.log(`   • Host → Guest (Vehicle): 5.0★`);
    console.log(`\n🔔 NOTIFICATIONS: 4 created`);
    console.log(`💬 CONVERSATIONS: 1 created (3 messages)`);
    console.log(`💰 PAYOUTS: 1 pending request (${47000} DZD)`);
    console.log(`📝 HOST APPLICATIONS: 1 approved`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n✅ All data seeded successfully!');
    console.log('🚀 Ready for testing on http://localhost:3000 and http://localhost:5000');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
