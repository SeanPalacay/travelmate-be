const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http');                // <-- We'll create a server from the 'http' module
const WebSocket = require('ws');            // <-- WebSocket

// ========== Express App and Middlewares ==========
const app = express();
app.use(bodyParser.json());
app.use(cors());

// ========== MongoDB Connection ==========
mongoose
  .connect(
    'mongodb+srv://dbUser:12345@cluster0.dgpab.mongodb.net/project11',
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

// ========== Multer Configuration for File Uploads ==========
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 'uploads/' folder to store uploaded files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname); // Unique file name
  },
});
const upload = multer({ storage: storage });

/****************************************************
 *  SCHEMAS AND MODELS
 ****************************************************/

// --- Notification Schema/Model ---
const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Notification = mongoose.model('Notification', notificationSchema);

// --- GeneratedTrip Schema/Model ---
const GeneratedTripSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  tripName: {
    type: String,
    required: true,
  },
  locality: {
    type: String,
    required: true,
  },
  numberOfDays: {
    type: Number,
    required: true,
  },
  groupSize: {
    type: Number,
    required: true,
  },
  categories: [
    {
      type: String,
      required: true,
    },
  ],
  dayWiseDestinations: [
    {
      destinationId: {
        type: String,
        required: true,
      },
      destination_name: {
        type: String,
        required: true,
      },
      coverphoto: {
        type: String,
        required: true,
      },
      dayNumber: {
        type: Number,
        required: true,
      },
      order: {
        type: Number,
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const GeneratedTrip = mongoose.model('GeneratedTrip', GeneratedTripSchema, 'generated_trips');

// --- Review Schema/Model ---
const ReviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
    },
    review_title: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    proof: {
      type: String, // This will store the path to the proof image
    },
    destination_id: {
      type: String,
      ref: 'Destination',
      required: true,
    },
    user_id: {
      type: String,
      ref: 'User', // Reference to the User model
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true, versionKey: false }
);
const Review = mongoose.model('Review', ReviewSchema, 'reviews');

// --- SavedDestination Schema/Model ---
const SavedDestinationSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      ref: 'User',
      required: true,
    },
    destination_id: {
      type: String,
      ref: 'Destination',
      required: true,
    },
    saved_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, versionKey: false }
);
const SavedDestination = mongoose.model(
  'SavedDestination',
  SavedDestinationSchema,
  'saved_destinations'
);

// --- User Schema/Model ---
const UserSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    birthdate: {
      type: Date,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    mobile_no: {
      type: String,
      required: true,
      unique: true,
    },
    business_name: {
      type: String,
      default: 'clientuser',
      required: true,
    },
    type: {
      type: String,
      enum: ['admin', 'superadmin', 'owner', 'client'],
      default: 'client',
    },
    savedDestinations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Destination',
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

// pre-save hook to clear savedDestinations if type != 'client'
UserSchema.pre('save', function (next) {
  if (this.type !== 'client') {
    this.savedDestinations = undefined;
  }
  next();
});

// Hide savedDestinations for non-client
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  if (user.type !== 'client') {
    delete user.savedDestinations;
  }
  return user;
};

const User = mongoose.model('User', UserSchema, 'users');

// --- Destination Schema/Model ---
const DestinationSchema = new mongoose.Schema(
  {
    locality: {
      type: String,
      required: true,
    },
    destination_name: {
      type: String,
      required: true,
    },
    destination_address: {
      type: String,
      required: true,
    },
    coverphoto: {
      type: String, // Store only the filename
      required: true,
      validate: {
        validator: function (value) {
          return typeof value === 'string' && value.length > 0;
        },
        message: 'Coverphoto filename is required',
      },
    },
    category: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    amenities: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);
const Destination = mongoose.model('Destination', DestinationSchema, 'destinations');

// --- Fare Schema/Model ---
const FareSchema = new mongoose.Schema(
  {
    locality: {
      type: String,
      required: true,
    },
    vehicle: {
      type: String,
      required: true,
    },
    operating_hours: {
      type: String,
      required: true,
    },
    distance: {
      type: String,
      required: true,
    },
    discounted_fare: {
      type: String,
      required: true,
    },
    regular_fare: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);
const Fare = mongoose.model('Fare', FareSchema, 'fares'); // third arg sets the collection name
module.exports = Fare;

// --- Itinerary Schema/Model ---
const ItinerarySchema = new mongoose.Schema(
  {
    locality: {
      type: String,
      required: true,
    },
    number_days: {
      type: Number,
      required: true,
    },
    group_size: {
      type: Number,
      required: true,
    },
    trip_name: {
      type: String,
      required: true,
    },
    category: {
      type: [String], // e.g. [ 'Resort', 'Hotel' ]
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);
const Itinerary = mongoose.model('Itinerary', ItinerarySchema, 'itineraries');

/****************************************************
 *  EXPRESS ROUTES
 ****************************************************/

/* 
    -- Below are all your routes copied from server.js --
    You can reorder or group them as you wish.
    Make sure they appear AFTER your model definitions.
*/

// 1) Notifications
app.post('/notifications', async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id and message are required' });
  }
  try {
    const notification = new Notification({ user_id, message });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error saving notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/notifications/:user_id', async (req, res) => {
  const user_id = req.params.user_id;
  try {
    const notifications = await Notification.find({ user_id: user_id });
    if (notifications.length === 0) {
      return res
        .status(404)
        .json({ message: 'No notifications found for this user' });
    }
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2) Save generated trip
app.post('/generated-trips', async (req, res) => {
  console.log('Received save request:', req.body); // Debug log

  try {
    const {
      userId,
      tripName,
      locality,
      numberOfDays,
      groupSize,
      categories,
      dayWiseDestinations,
      createdAt,
    } = req.body;

    // Validate required fields
    if (!userId || !tripName || !locality || !numberOfDays || !groupSize || !categories) {
      console.log('Missing required fields'); // Debug
      return res.status(400).json({
        message: 'Missing required fields',
        received: { userId, tripName, locality, numberOfDays, groupSize, categories },
      });
    }

    // Check if trip already exists
    const existingTrip = await GeneratedTrip.findOne({
      userId,
      tripName,
    });

    if (existingTrip) {
      console.log('Trip already exists'); // Debug
      return res.status(400).json({
        message: 'A trip with this name already exists for this user',
      });
    }

    // Create new trip
    const newTrip = new GeneratedTrip({
      userId,
      tripName,
      locality,
      numberOfDays,
      groupSize,
      categories,
      dayWiseDestinations,
      createdAt: createdAt || new Date(),
    });

    await newTrip.save();
    console.log('Trip saved successfully'); // Debug

    res.status(201).json({
      message: 'Trip saved successfully',
      trip: newTrip,
    });
  } catch (error) {
    console.error('Error saving trip:', error); // Debug
    res.status(500).json({
      message: 'Error saving trip',
      error: error.message,
    });
  }
});

// 3) Delete generated trip
app.delete('/generated-trips', async (req, res) => {
  console.log('Received delete request:', req.body); // Debug

  try {
    const { userId, tripName } = req.body;

    if (!userId || !tripName) {
      return res
        .status(400)
        .json({ message: 'userId and tripName are required' });
    }

    const result = await GeneratedTrip.findOneAndDelete({
      userId,
      tripName,
    });

    if (!result) {
      console.log('Trip not found'); // Debug
      return res.status(404).json({ message: 'Trip not found' });
    }

    console.log('Trip deleted successfully'); // Debug
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error); // Debug
    res.status(500).json({
      message: 'Error deleting trip',
      error: error.message,
    });
  }
});

// 4) Add this new endpoint in your server.js
app.post('/destinations-by-ids', async (req, res) => {
    try {
      const { destinationIds } = req.body;
  
      // Validate input
      if (!destinationIds || !Array.isArray(destinationIds)) {
        return res.status(400).json({ message: 'Invalid or missing destinationIds' });
      }
  
      console.log('Received destination IDs:', destinationIds);
  
      // Convert string IDs to MongoDB ObjectIds
      const objectIds = destinationIds.map((id) => new mongoose.Types.ObjectId(id)); // Use 'new' keyword
  
      console.log('Converted ObjectIds:', objectIds);
  
      // Fetch destinations from MongoDB
      const destinations = await Destination.find(
        { _id: { $in: objectIds } },
        { _id: 1, destination_name: 1, category: 1, coverphoto: 1 }
      );
  
      console.log('Fetched destinations:', destinations);
  
      // If no destinations are found, return a 404 error
      if (!destinations.length) {
        return res.status(404).json({ message: 'No destinations found for the provided IDs' });
      }
  
      // Convert ObjectIds to strings for JSON serialization
      const formattedDestinations = destinations.map((dest) => ({
        ...dest.toObject(),
        _id: dest._id.toString(),
      }));
  
      res.status(200).json(formattedDestinations);
    } catch (error) {
      console.error('Error fetching destinations by IDs:', error);
      res.status(500).json({ message: 'Error fetching destinations', error: error.message });
    }
  });
// 5) Add/remove destinations to a trip
app.post('/generated-trips/:tripId/add-destination', async (req, res) => {
  const { tripId } = req.params;
  const { destinationId, dayNumber } = req.body;

  try {
    const trip = await GeneratedTrip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Add the destination to the dayWiseDestinations array
    trip.dayWiseDestinations.push({
      destinationId,
      dayNumber,
      order: trip.dayWiseDestinations.length + 1,
    });

    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Error adding destination', error });
  }
});

app.post('/generated-trips/:tripId/remove-destination', async (req, res) => {
  const { tripId } = req.params;
  const { destinationId, dayNumber } = req.body;

  try {
    const trip = await GeneratedTrip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Remove the destination from the dayWiseDestinations array
    trip.dayWiseDestinations = trip.dayWiseDestinations.filter(
      (dest) =>
        dest.destinationId !== destinationId || dest.dayNumber !== dayNumber
    );

    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Error removing destination', error });
  }
});

// 6) Update generated trip
app.put('/generated-trips/:tripId', async (req, res) => {
  try {
    console.log('Updating trip:', req.params.tripId);
    console.log('Update data:', req.body);

    const tripId = req.params.tripId;
    const updateData = {
      tripName: req.body.tripName,
      locality: req.body.locality,
      numberOfDays: req.body.numberOfDays,
      groupSize: req.body.groupSize,
      categories: req.body.categories,
      dayWiseDestinations: req.body.dayWiseDestinations,
    };

    const updatedTrip = await GeneratedTrip.findByIdAndUpdate(
      tripId,
      updateData,
      { new: true }
    );

    if (!updatedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.status(200).json(updatedTrip);
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({
      message: 'Error updating trip',
      error: error.message,
    });
  }
});

// 7) Get trips for a specific user
app.get('/generated-trips/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching trips for userId:', userId);

    const trips = await GeneratedTrip.find({ userId }).sort({ createdAt: -1 }); // newest first
    console.log('Found trips:', trips.length);

    res.status(200).json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({
      message: 'Error fetching trips',
      error: error.message,
    });
  }
});

// 8) Save a destination for a user
app.post('/save_destination', async (req, res) => {
  try {
    const { user_id, destination_id } = req.body;

    // Check if the destination is already saved by the user
    const alreadySaved = await SavedDestination.findOne({ user_id, destination_id });
    if (alreadySaved) {
      return res.status(400).json({ message: 'Destination is already saved' });
    }

    // Create a new saved destination entry
    const savedDestination = new SavedDestination({
      user_id,
      destination_id,
    });

    await savedDestination.save();
    res.status(201).json({
      message: 'Destination saved successfully',
      savedDestination,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving destination', error });
  }
});

// 9) Delete a saved destination
app.delete('/saved_destinations', async (req, res) => {
  try {
    const { user_id, destination_id } = req.body;

    if (!user_id || !destination_id) {
      return res
        .status(400)
        .json({ message: 'User ID and Destination ID are required.' });
    }

    const deletedDestination = await SavedDestination.findOneAndDelete({
      user_id,
      destination_id,
    });

    if (!deletedDestination) {
      return res.status(404).json({ message: 'Saved destination not found.' });
    }

    res.status(200).json({ message: 'Saved destination removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing saved destination', error });
  }
});

// 10) Get all saved destinations for a user
app.get('/saved_destinations/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const savedDestinations = await SavedDestination.find({ user_id }).populate(
      'destination_id'
    ); // populate the destination details

    res.status(200).json({ savedDestinations });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching saved destinations', error });
  }
});

// 11) Signup route
app.post('/signup', async (req, res) => {
  const { firstname, lastname, email, birthdate, mobile_no, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const newUser = new User({
      firstname,
      lastname,
      email,
      birthdate,
      mobile_no,
      password,
    });
    await newUser.save();
    res.status(201).json({ message: 'User signed up successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error });
  }
});

// 12) Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.password === password) {
      return res.status(200).json({ message: 'Login successful', userId: user._id });
    } else {
      return res.status(401).json({ message: 'Incorrect password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// 13) Search page, search bar
app.get('/destinations', async (req, res) => {
  const { search } = req.query;
  try {
    const destinations = await Destination.find({
      $and: [
        {
          $or: [
            { destination_name: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
          ],
        },
        { status: 'approved' },
      ],
    }).limit(10);

    console.log(destinations);
    res.status(200).json(destinations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching destinations', error });
  }
});

// 14) Serve static files for coverphoto
app.use('/destinations/coverphoto', express.static(path.join(__dirname, 'destinations/coverphoto')));
console.log('Serving static files from:', path.join(__dirname, 'destinations/coverphoto'));

app.use((req, res, next) => {
  console.log('Requested URL:', req.url);
  next();
});

// 15) Carousel destinations
app.get('/carousel-destinations', async (req, res) => {
  try {
    const destinations = await Destination.find({ 
      status: 'approved',
      category: 'Adventure'  // Add this filter
    })
    .select('_id destination_name destination_address operating_hours category about amenities coverphoto')
    .limit(5);

    console.log('Fetched Adventure Destinations:', destinations);

    const laravelBaseUrl = 'http://https://travelmate-be.onrender.com/images/coverphotos/';
    destinations.forEach((destination) => {
      if (destination.coverphoto) {
        destination.coverphoto = `${laravelBaseUrl}${destination.coverphoto}`;
      }
    });

    res.status(200).json(destinations);
  } catch (error) {
    console.error('Error fetching carousel destinations:', error);
    res.status(500).json({ 
      message: 'Error fetching carousel destinations', 
      error: error.message 
    });
  }
});

// 16) Tourist spots by category
app.get('/tourist-spots', async (req, res) => {
  try {
    const categories = ['Park', 'Adventure', 'Art Galleries'];
    const destinations = await Destination.find({
      category: { $in: categories },
      status: 'approved',
    });

    if (!destinations.length) {
      return res.status(404).json({ message: 'No tourist spots found' });
    }

    const laravelBaseUrl = 'http://https://travelmate-be.onrender.com/images/coverphotos/';
    destinations.forEach((destination) => {
      if (destination.coverphoto) {
        destination.coverphoto = `${laravelBaseUrl}${destination.coverphoto}`;
      }
    });

    res.status(200).json(destinations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tourist spots', error });
  }
});

// 17) Save/unsave a destination (User-based)
app.post('/save-destination', async (req, res) => {
  const { userId, destinationId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.savedDestinations.includes(destinationId)) {
      user.savedDestinations.push(destinationId);
      await user.save();
      res.status(200).json({ message: 'Destination saved successfully' });
    } else {
      res.status(400).json({ message: 'Destination already saved' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error saving destination', error });
  }
});

app.post('/unsave-destination', async (req, res) => {
  const { userId, destinationId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const index = user.savedDestinations.indexOf(destinationId);
    if (index > -1) {
      user.savedDestinations.splice(index, 1);
      await user.save();
      res.status(200).json({ message: 'Destination unsaved successfully' });
    } else {
      res.status(400).json({ message: 'Destination not found in saved list' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error unsaving destination', error });
  }
});

app.get('/saved-destinations/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).populate('savedDestinations');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user.savedDestinations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching saved destinations', error });
  }
});

// 18) Fetch destinations for review
app.get('/review-destinations', async (req, res) => {
  const { search } = req.query;
  try {
    const destinations = await Destination.find({
      destination_name: { $regex: search, $options: 'i' },
      status: 'approved',
    }).limit(10);

    res.status(200).json(destinations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviewable destinations', error });
  }
});

// 19) Reviews with user info
app.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user_id', 'firstname lastname')
      .populate('destination', 'name'); // If you want destination info

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews', error });
  }
});

// 20) Submit review
app.post('/submit-review', upload.single('proof'), async (req, res) => {
  console.log('Submit review triggered on backend');
  console.log('Request body:', req.body);
  console.log('Uploaded file:', req.file);

  const { rating, review_title, comment, date, destination_id, user_id, status } = req.body;
  const proof = req.file ? req.file.path : null;

  try {
    // Check if destination existsf
    const destination = await Destination.findById(destination_id);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }
    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newReview = new Review({
      rating,
      review_title,
      comment,
      date: new Date(date),
      proof,
      destination_id: destination._id,
      user_id: user._id,
    });

    await newReview.save();
    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Error submitting review', error });
  }
});

// 21) Get all itineraries
app.get('/itineraries', async (req, res) => {
  try {
    const itineraries = await Itinerary.find();
    res.status(200).json(itineraries);
  } catch (error) {
    console.error('Error fetching itineraries:', error);
    res.status(500).json({ message: 'Error fetching itineraries', error });
  }
});

// 22) For ratings
app.get('/reviews/:destinationId', async (req, res) => {
  try {
    const { destinationId } = req.params;
    const reviews = await Review.find({ destination_id: destinationId }).populate({
      path: 'user_id',
      select: 'firstname lastname',
    });
    console.log('Reviews with populated user:', reviews);

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviews.forEach((review) => {
      const rating = parseFloat(review.rating);
      if (rating >= 1 && rating <= 5) {
        totalRating += rating;
        const roundedRating = Math.round(rating);
        ratingBreakdown[roundedRating] += 1;
      }
    });

    const averageRating = totalRating / reviews.length;

    res.status(200).json({
      reviews: reviews.map((review) => ({
        name: `${review.user_id?.firstname || 'Unknown'} ${
          review.user_id?.lastname || 'User'
        }`,
        rating: review.rating,
        review_title: review.review_title,
        comment: review.comment,
        date: review.date,
        proof: review.proof, // Include the proof field
      })),
      averageRating: Number(averageRating.toFixed(1)),
      ratingBreakdown,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews', error });
  }
});

// 23) For profile page
app.get('/get-user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data', error });
  }
});

// 24) Get all approved destinations
app.get('/all-destinations', async (req, res) => {
  try {
    const destinations = await Destination.find({ status: 'approved' }).sort({
      category: 1,
      destination_name: 1,
    });

    const destinationsWithImages = destinations.map((destination) => {
      const destObj = destination.toObject();
      destObj.coverphoto = destination.coverphoto
        ? `http://https://travelmate-be.onrender.com/images/coverphotos/${destination.coverphoto}`
        : 'https://via.placeholder.com/150';
      return destObj;
    });

    if (!destinations.length) {
      return res.status(404).json({ message: 'No destinations found' });
    }

    res.status(200).json(destinationsWithImages);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ message: 'Error fetching destinations', error: error.message });
  }
});

// 25) Fetch destinations based on categories
app.post('/destinations-by-category', async (req, res) => {
  try {
    const { categories } = req.body;
    console.log('Fetching destinations for categories:', categories);

    const destinations = await Destination.find({
      category: { $in: categories },
      status: 'approved',
    });

    console.log(`Found ${destinations.length} destinations`);
    res.status(200).json(destinations);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ message: 'Error fetching destinations', error });
  }
});

// 26) Save itinerary
app.post('/save-itinerary', async (req, res) => {
  const { locality, number_days, group_size, trip_name, category } = req.body;
  try {
    // Find destinations by locality
    const destinations = await Destination.find({
      locality: { $regex: locality, $options: 'i' },
    }).limit(10);

    if (destinations.length === 0) {
      return res
        .status(404)
        .json({ message: 'No destinations found for this locality' });
    }

    // Extract distinct categories
    const categories = [
      ...new Set(destinations.map((destination) => destination.category)),
    ];
    if (categories.length === 0) {
      return res.status(404).json({ message: 'No categories found for this locality' });
    }

    // Create a new itinerary
    const newItinerary = new Itinerary({
      locality,
      number_days,
      group_size,
      trip_name,
      category, // we store the category from the request
    });
    const savedItinerary = await newItinerary.save();
    console.log('Saved Itinerary:', savedItinerary);

    res.status(201).json(savedItinerary);
  } catch (error) {
    console.error('Error saving itinerary:', error);
    res.status(500).json({ message: 'Error saving itinerary', error });
  }
});

// 27) Fetch distinct categories
app.get('/categories', async (req, res) => {
  try {
    const categories = await Destination.distinct('category');
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error });
  }
});

// 28) Search locality suggestions
app.get('/search-locality', async (req, res) => {
  const { query } = req.query;
  try {
    const destinations = await Destination.find({
      locality: { $regex: query, $options: 'i' },
    }).limit(10);

    if (destinations.length === 0) {
      return res.status(404).json({ message: 'No Locality found' });
    }
    const localityNames = destinations.map((dest) => dest.locality);
    res.status(200).json(localityNames);
  } catch (error) {
    console.error('Error fetching localities:', error);
    res.status(500).json({ message: 'Error fetching localities' });
  }
});

// 29) Fetch fares by locality
app.get('/fares', async (req, res) => {
  const { locality } = req.query;
  try {
    // Notice your FareSchema uses "locality" and also "designated_locality" in the route—adjust if needed
    // If your schema field is actually "locality", update your queries accordingly
    const fares = await Fare.find({
      designated_locality: { $regex: locality, $options: 'i' },
    });
    if (fares.length === 0) {
      return res.status(404).json({ message: 'No fares found for this locality' });
    }
    res.status(200).json(fares);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fares', error });
  }
});

// 30) Get all fares
app.get('/getFares', async (req, res) => {
  try {
    const fares = await Fare.find();
    res.status(200).json(fares);
  } catch (error) {
    console.error('Error retrieving fares:', error);
    res.status(500).json({ message: 'Failed to retrieve fares', error: error.message });
  }
});

// 31) Get localities from fares
app.get('/localities', async (req, res) => {
  try {
    const localities = await Fare.distinct('designated_locality');
    res.status(200).json(localities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching localities', error });
  }
});

// 32) Update itinerary
app.put('/update-itinerary/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tripName, locality, numberOfDays, groupSize, categories, dayWiseDestinations } =
      req.body;

    const updatedTrip = await GeneratedTrip.findByIdAndUpdate(
      id,
      {
        tripName,
        locality,
        numberOfDays,
        groupSize,
        categories,
        dayWiseDestinations,
      },
      { new: true }
    );

    if (!updatedTrip) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    res.status(200).json(updatedTrip);
  } catch (error) {
    console.error('Error updating itinerary:', error);
    res.status(500).json({ message: 'Error updating itinerary', error: error.message });
  }
});

/****************************************************
 *  WEBSOCKET SETUP
 ****************************************************/

// Create an HTTP server from the Express app
const server = http.createServer(app);

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// When a client connects via WebSocket
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Optionally handle messages from the client
  ws.on('message', (message) => {
    console.log('Received:', message);
    try {
      const { user_id } = JSON.parse(message);
      console.log(`User ID received: ${user_id}`);
      // If you'd like to send notifications to a specific user_id, you can do so.
      // For now, we're simply sending all notifications at intervals.
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format.' }));
    }
  });

  // Setup an interval to send notifications to the client every second
  const intervalId = setInterval(() => {
    sendNotifications(ws);
  }, 1000);

  // Clean up when client disconnects
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(intervalId);
  });
});

// Function to send all notifications to a given client
function sendNotifications(ws) {
  Notification.find({})
    .then((notifications) => {
      if (notifications.length > 0) {
        console.log(`Sending all notifications:`, notifications);
        ws.send(JSON.stringify(notifications));
      } else {
        console.log('No notifications found.');
      }
    })
    .catch((err) => {
      console.error('Failed to retrieve notifications:', err);
      ws.send(JSON.stringify({ error: 'Failed to retrieve notifications.' }));
    });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


/****************************************************
 *  START THE SERVER (HTTP + WEBSOCKET)
 ****************************************************/
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`HTTP & WebSocket server running on port ${PORT}`);
});
