  const express = require('express');
  const mongoose = require('mongoose');
  const bodyParser = require('body-parser');
  const cors = require('cors');
  const app = express();
  const multer = require('multer');
  const path = require('path');

  // Middleware
  app.use(bodyParser.json());
  app.use(cors());

  // MongoDB connection (replace with your MongoDB URI)
  mongoose.connect('mongodb+srv://dbUser:12345@cluster0.dgpab.mongodb.net/project11')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

  // Configure multer storage
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // 'uploads/' folder to store uploaded files
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname); // Unique file name
    }
  });

  const upload = multer({ storage: storage });

  // Define the notification schema
  const notificationSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  });

  // Create a model for notifications
  const Notification = mongoose.model('Notification', notificationSchema);

  // API endpoint to save a notification
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

  // API endpoint to retrieve notifications by user_id
  app.get('/notifications/:user_id', async (req, res) => {
    const user_id = req.params.user_id;

    try {
      const notifications = await Notification.find({ user_id: user_id }); // Retrieve notifications by user_id
      if (notifications.length === 0) {
        return res.status(404).json({ message: 'No notifications found for this user' });
      }
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Error retrieving notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Define the GeneratedTrip schema
  const GeneratedTripSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true
    },
    tripName: {
      type: String,
      required: true
    },
    locality: {
      type: String,
      required: true
    },
    numberOfDays: {
      type: Number,
      required: true
    },
    groupSize: {
      type: Number,
      required: true
    },
    categories: [{
      type: String,
      required: true
    }],
    dayWiseDestinations: [{
      destinationId: {
        type: String,
        required: true
      },
      destination_name: {
        type: String,
        required: true
      },
      coverphoto: {
        type: String,
        required: true
      },
      dayNumber: {
        type: Number,
        required: true
      },
      order: {
        type: Number,
        required: true
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

  const GeneratedTrip = mongoose.model('GeneratedTrip', GeneratedTripSchema, 'generated_trips');

  // Save generated trip endpoint
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
        createdAt
      } = req.body;

      // Validate required fields
      if (!userId || !tripName || !locality || !numberOfDays || !groupSize || !categories) {
        console.log('Missing required fields'); // Debug log
        return res.status(400).json({ 
          message: 'Missing required fields',
          received: { userId, tripName, locality, numberOfDays, groupSize, categories }
        });
      }

      // Check if trip already exists
      const existingTrip = await GeneratedTrip.findOne({
        userId,
        tripName
      });

      if (existingTrip) {
        console.log('Trip already exists'); // Debug log
        return res.status(400).json({
          message: 'A trip with this name already exists for this user'
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
        createdAt: createdAt || new Date()
      });

      await newTrip.save();
      console.log('Trip saved successfully'); // Debug log

      res.status(201).json({
        message: 'Trip saved successfully',
        trip: newTrip
      });

    } catch (error) {
      console.error('Error saving trip:', error); // Debug log
      res.status(500).json({
        message: 'Error saving trip',
        error: error.message
      });
    }
  });

  // Delete generated trip endpoint
  app.delete('/generated-trips', async (req, res) => {
    console.log('Received delete request:', req.body); // Debug log

    try {
      const { userId, tripName } = req.body;

      if (!userId || !tripName) {
        return res.status(400).json({ message: 'userId and tripName are required' });
      }

      const result = await GeneratedTrip.findOneAndDelete({
        userId,
        tripName
      });

      if (!result) {
        console.log('Trip not found'); // Debug log
        return res.status(404).json({ message: 'Trip not found' });
      }

      console.log('Trip deleted successfully'); // Debug log
      res.status(200).json({ message: 'Trip deleted successfully' });

    } catch (error) {
      console.error('Error deleting trip:', error); // Debug log
      res.status(500).json({
        message: 'Error deleting trip',
        error: error.message
      });
    }
  });

  // Add this new endpoint in your server.js
  app.post('/destinations-by-ids', async (req, res) => {
    try {
      const { destinationIds } = req.body;
      
      // Convert string IDs to ObjectIds if necessary
      const objectIds = destinationIds.map(id => mongoose.Types.ObjectId(id));
      
      const destinations = await Destination.find({
        '_id': { $in: objectIds }
      });

      if (!destinations.length) {
        return res.status(404).json({ message: 'No destinations found' });
      }

      res.status(200).json(destinations);
    } catch (error) {
      console.error('Error fetching destinations by IDs:', error);
      res.status(500).json({ message: 'Error fetching destinations', error });
    }
  });

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
        (dest) => dest.destinationId !== destinationId || dest.dayNumber !== dayNumber
      );

      await trip.save();
      res.status(200).json(trip);
    } catch (error) {
      res.status(500).json({ message: 'Error removing destination', error });
    }
  });

  // Update generated trip
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
        dayWiseDestinations: req.body.dayWiseDestinations
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
        error: error.message 
      });
    }
  });

  // Get trips for a specific user
  app.get('/generated-trips/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('Fetching trips for userId:', userId);

      const trips = await GeneratedTrip.find({ userId })
        .sort({ createdAt: -1 }); // Sort by newest first
      
      console.log('Found trips:', trips.length);
      
      res.status(200).json(trips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      res.status(500).json({
        message: 'Error fetching trips',
        error: error.message
      });
    }
  });

  // Define the Review schema
  const ReviewSchema = new mongoose.Schema({
    rating: {
      type: Number,
      required: true
    },
    review_title: {
      type: String,
      required: true
    },
    comment: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    proof: {
      type: String // This will store the path to the proof image
    },
    destination_id: {
      type: String,
      ref: 'Destination',
      required: true
    },
    user_id: {  // Reference to the client_users collection via the User model
      type: String,
      ref: 'User',  // Reference to the User model that is tied to the 'client_users' collection
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending'
    },
  }, { timestamps: true, versionKey: false });

  // Define the Review model
  const Review = mongoose.model('Review', ReviewSchema, 'reviews');

  // Define the SavedDestination schema
  const SavedDestinationSchema = new mongoose.Schema({
    user_id: {
      type: String,
      ref: 'User',
      required: true
    },
    destination_id: {
      type: String,
      ref: 'Destination',
      required: true
    },
    saved_at: {
      type: Date,
      default: Date.now
    }
  }, { timestamps: true, versionKey: false });

  // Define the SavedDestination model
  const SavedDestination = mongoose.model('SavedDestination', SavedDestinationSchema, 'saved_destinations');

  // Route to save a destination for a user
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
        destination_id
      });

      await savedDestination.save();
      res.status(201).json({ message: 'Destination saved successfully', savedDestination });
    } catch (error) {
      res.status(500).json({ message: 'Error saving destination', error });
    }
  });

  // Route to delete a saved destination
  app.delete('/saved_destinations', async (req, res) => {
    try {
      const { user_id, destination_id } = req.body;

      // Validate input
      if (!user_id || !destination_id) {
        return res.status(400).json({ message: 'User ID and Destination ID are required.' });
      }

      // Find and delete the saved destination
      const deletedDestination = await SavedDestination.findOneAndDelete({
        user_id,
        destination_id
      });

      if (!deletedDestination) {
        return res.status(404).json({ message: 'Saved destination not found.' });
      }

      res.status(200).json({ message: 'Saved destination removed successfully.' });
    } catch (error) {
      res.status(500).json({ message: 'Error removing saved destination', error });
    }
  });

  // Route to get all saved destinations for a user
  app.get('/saved_destinations/:user_id', async (req, res) => {
    try {
      const { user_id } = req.params;

      // Fetch all saved destinations for the user
      const savedDestinations = await SavedDestination.find({ user_id })
        .populate('destination_id');  // Populate the destination details

      res.status(200).json({ savedDestinations });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching saved destinations', error });
    }
  });

  // Define the User schema NEW UPDATED
  const UserSchema = new mongoose.Schema({
    firstname: {
      type: String,
      required: true
    },
    lastname: {
      type: String,
      required: true
    },
    birthdate: {
      type: Date,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    mobile_no: {
      type: String,
      required: true,
      unique: true
    },
    business_name: {
      type: String,
      default: "clientuser",
      required: true
    },
    type: {
      type: String,
      enum: ['admin', 'superadmin', 'owner', 'client'],
      default: 'client'
    },
    savedDestinations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Destination'
      }
    ]
  }, { timestamps: true, versionKey: false });

  // Add a pre-save hook to clear savedDestinations if the type is not 'client'
  UserSchema.pre('save', function(next) {
    if (this.type !== 'client') {
      this.savedDestinations = undefined; // Remove savedDestinations field
    }
    next();
  });

  // Apply transformations on toJSON or toObject to hide savedDestinations in admin, owner, or superadmin
  UserSchema.methods.toJSON = function() {
    const user = this.toObject();
    if (user.type !== 'client') {
      delete user.savedDestinations; // Remove the field before sending the response
    }
    return user;
  };

  // Define the User model using the 'users' collection
  const User = mongoose.model('User', UserSchema, 'users');

  // Update generated trip endpoint
  app.put('/update-itinerary/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        tripName,
        locality,
        numberOfDays,
        groupSize,
        categories,
        dayWiseDestinations,
      } = req.body;

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

  // Define the Destination schema
  const DestinationSchema = new mongoose.Schema({
    locality: {
      type: String,
      required: true
    },
    destination_name: {
      type: String,
      required: true
    },
    destination_address: {
      type: String,
      required: true
    },
    coverphoto: {
      type: String,  // Store only the filename
      required: true,
      validate: {
        validator: function(value) {
          // Ensure it is a non-empty string (this can be adjusted as needed)
          return typeof value === 'string' && value.length > 0;
        },
        message: 'Coverphoto filename is required'
      }
    },
    category: {
      type: String,  // You can also use [String] if it's an array of categories
      required: true  // Make it required if necessary
    },
    status: {
      type: String,  
      required: true
    },
    amenities: {
      type: String,  
      required: true
    }
  }, { timestamps: true, versionKey: false });

  // Define the Destination model using the 'destinations' collection
  const Destination = mongoose.model('Destination', DestinationSchema, 'destinations');

  const FareSchema = new mongoose.Schema({
    locality: {
      type: String,
      required: true
    },
    vehicle: {
      type: String,
      required: true
    },
    operating_hours: {
      type: String,
      required: true
    },
    distance: {
      type: String,
      required: true
    },
    discounted_fare: {
      type: String,
      required: true
    },
    regular_fare: {
      type: String,
      required: true
    }
  }, { timestamps: true, versionKey: false });

  // Ensure it uses the 'fares' collection
  const Fare = mongoose.model('Fare', FareSchema, 'fares'); // Third argument explicitly sets the collection name

  module.exports = Fare;

  // ItinerarySchema
  const ItinerarySchema = new mongoose.Schema({
    locality: {
      type: String,
      required: true
    },
    number_days: {
      type: Number,
      required: true
    },
    group_size: {
      type: Number,
      required: true
    },
    trip_name: {
      type: String,
      required: true
    },
    category: {
      type: [String],  // Array of categories like Resort, Hotel, etc.
      required: true
    }
  }, { timestamps: true, versionKey: false });

  const Itinerary = mongoose.model('Itinerary', ItinerarySchema, 'itineraries');

  // Route to save an itinerary
  app.post('/save-itinerary', async (req, res) => {
    const { locality, number_days, group_size, trip_name, category} = req.body;

    try {
      // Find destinations based on the locality
      const destinations = await Destination.find({
        locality: { $regex: locality, $options: 'i' } // Case-insensitive search
      }).limit(10);

      if (destinations.length === 0) {
        return res.status(404).json({ message: 'No destinations found for this locality' });
      }

      // Extract distinct categories from the found destinations
      const categories = [...new Set(destinations.map(destination => destination.category))];

      // If no categories were found, you might want to handle it
      if (categories.length === 0) {
        return res.status(404).json({ message: 'No categories found for this locality' });
      }

      // Create a new itinerary with the categories from the destinations
      const newItinerary = new Itinerary({
        locality,
        number_days,
        group_size,
        trip_name,
        category
      });

      // Save the itinerary to the database
      const savedItinerary = await newItinerary.save();

      console.log('Saved Itinerary:', savedItinerary);

      // Return the final response with the saved itinerary
      return res.status(201).json(savedItinerary);

    } catch (error) {
      console.error('Error saving itinerary:', error);
      return res.status(500).json({ message: 'Error saving itinerary', error });
    }
  });

  // Route to fetch distinct categories from destinations
  app.get('/categories', async (req, res) => {
    try {
      const categories = await Destination.distinct('category');
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Error fetching categories', error });
    }
  });

  // Route to fetch locality suggestions based on search query
  app.get('/search-locality', async (req, res) => {
    const { query } = req.query; // Get the search query from the request

    try {
      const destinations = await Destination.find({
        locality: { $regex: query, $options: 'i' } // Case-insensitive search on locality
      }).limit(10); // Limit results to 10 suggestions

      if (destinations.length === 0) {
        return res.status(404).json({ message: 'No Locality found' });
      }

      const localityNames = destinations.map(destination => destination.locality);

      // Return the locality names as JSON
      res.status(200).json(localityNames);
    } catch (error) {
      console.error('Error fetching localities:', error);
      res.status(500).json({ message: 'Error fetching localities' });
    }
  });

  // Route to fetch fares based on locality
  app.get('/fares', async (req, res) => {
    const { locality } = req.query;

    try {
      const fares = await Fare.find({
        designated_locality: { $regex: locality, $options: 'i' } // Case-insensitive search
      });

      if (fares.length === 0) {
        return res.status(404).json({ message: 'No fares found for this locality' });
      }

      res.status(200).json(fares);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching fares', error });
    }
  });

  // Route to get all fares
  app.get('/getFares', async (req, res) => {
    try {
      const fares = await Fare.find();
      res.status(200).json(fares);
    } catch (error) {
      console.error('Error retrieving fares:', error); // Log the full error to the console
      res.status(500).json({ message: 'Failed to retrieve fares', error: error.message });
    }
  });

  // Route to fetch locality suggestions for fares (for auto-suggestions)
  app.get('/localities', async (req, res) => {
    try {
      const localities = await Fare.distinct('designated_locality'); // Get unique localities

      res.status(200).json(localities);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching localities', error });
    }
  });

  // Signup route
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
        password,  // In a real-world app, hash the password before saving
      });

      await newUser.save();  // Insert user into the 'client_users' collection
      res.status(201).json({ message: 'User signed up successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error });
    }
  });

  // Login route
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

  // Search page, search bar
  app.get('/destinations', async (req, res) => {
    const { search } = req.query;  // Get the search query from the request

    try {
      // Perform a search based on the destination name or category, and filter by status "approved"
      const destinations = await Destination.find({
        $and: [
          {
            $or: [
              { destination_name: { $regex: search, $options: 'i' } }, // Search by destination name
              { category: { $regex: search, $options: 'i' } }          // Search by category
            ]
          },
          { status: 'approved' }  // Only fetch destinations with status "approved"
        ]
      }).limit(10);  // Limit the results to 10 destinations

      console.log(destinations);

      res.status(200).json(destinations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching destinations', error });
    }
  });

  // for coverphoto http
  app.use(cors());

  // coverphoto path
  app.use('/destinations/coverphoto', express.static(path.join(__dirname, 'destinations/coverphoto')));
  console.log('Serving static files from:', path.join(__dirname, 'destinations/coverphoto'));

  app.use((req, res, next) => {
    console.log('Requested URL:', req.url); // Log every request
    next();
  });

  //carousel routes 
  app.get('/carousel-destinations', async (req, res) => {
    try {
      const destinations = await Destination.find({ status: 'approved'})
        .select('_id destination_name destination_address operating_hours category about amenities coverphoto')
        .limit(5);
      console.log('Fetched Destinations:', destinations); 

      const laravelBaseUrl = 'http://146.190.87.44/images/coverphotos/'; 

      // Append the base URL to the coverphoto filename
      destinations.forEach(destination => {
        if (destination.coverphoto) {
          destination.coverphoto = `${laravelBaseUrl}${destination.coverphoto}`; // Construct the full URL
        }
      });

      res.status(200).json(destinations);
    } catch (error) {
      console.error('Error fetching carousel destinations:', error);
      res.status(500).json({ message: 'Error fetching carousel destinations', error: error.message });
    }
  });

  // Route to fetch destinations by specific categories
  app.get('/tourist-spots', async (req, res) => {
    try {
      const categories = ['Park', 'Adventure', 'Art Galleries']; // Categories to filter by

      // Find destinations that match the categories
      const destinations = await Destination.find({
        category: { $in: categories },
        status: 'approved' 
      });

      if (!destinations.length) {
        return res.status(404).json({ message: 'No tourist spots found' });
      }

      // Base URL for the Laravel server (where your images are stored)
      const laravelBaseUrl = 'http://146.190.87.44/images/coverphotos/';

      // Append the base URL to the coverphoto filename
      destinations.forEach(destination => {
        if (destination.coverphoto) {
          destination.coverphoto = `${laravelBaseUrl}${destination.coverphoto}`; // Construct the full URL for the coverphoto
        }
      });

      res.status(200).json(destinations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching tourist spots', error });
    }
  });

  // Route to save a destination for a user
  app.post('/save-destination', async (req, res) => {
    const { userId, destinationId } = req.body; // Expect userId and destinationId from request

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if destination is already saved
      if (!user.savedDestinations.includes(destinationId)) {
        user.savedDestinations.push(destinationId); // Save the destination
        await user.save(); // Update user document
        res.status(200).json({ message: 'Destination saved successfully' });
      } else {
        res.status(400).json({ message: 'Destination already saved' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error saving destination', error });
    }
  });

  // Route to unsave a destination for a user
  app.post('/unsave-destination', async (req, res) => {
    const { userId, destinationId } = req.body; // Expect userId and destinationId from request

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const index = user.savedDestinations.indexOf(destinationId);
      if (index > -1) {
        user.savedDestinations.splice(index, 1); // Remove the destination from saved list
        await user.save(); // Update user document
        res.status(200).json({ message: 'Destination unsaved successfully' });
      } else {
        res.status(400).json({ message: 'Destination not found in saved list' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error unsaving destination', error });
    }
  });

  // Route to fetch saved destinations for a user
  app.get('/saved-destinations/:userId', async (req, res) => {
    const { userId } = req.params; // Get the userId from the request parameters

    try {
      const user = await User.findById(userId).populate('savedDestinations'); // Populate the saved destinations
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json(user.savedDestinations); // Return the saved destinations
    } catch (error) {
      res.status(500).json({ message: 'Error fetching saved destinations', error });
    }
  });

  // Route to fetch destinations for review based on search query
  app.get('/review-destinations', async (req, res) => {
    const { search } = req.query;  // Get the search query from the request

    try {
      // Perform a search based on the destination name and additional filters for reviewable destinations
      const destinations = await Destination.find({
        destination_name: { $regex: search, $options: 'i' }, 
        status: 'approved'  // Case-insensitive search
        // Add any other conditions to fetch reviewable destinations (e.g., user-visited destinations, etc.)
      }).limit(10);  // Limit the results to 10 destinations

      res.status(200).json(destinations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching reviewable destinations', error });
    }
  });

  // for calling the firstname lastname'
  app.get('/reviews', async (req, res) => {
    try {
      // Fetch reviews and populate the user field with firstname and lastname
      const reviews = await Review.find()
        .populate('user_id', 'firstname lastname') // Only populate the firstname and lastname fields from the User model
        .populate('destination', 'name'); // Populate the destination field if needed

      res.status(200).json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Error fetching reviews', error });
    }
  });

  app.post('/submit-review', upload.single('proof'), async (req, res) => {
    console.log('Submit review triggered on backend');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    // Extract necessary fields from the request body
    const { rating, review_title, comment, date, destination_id, user_id, status, } = req.body; 
    const proof = req.file ? req.file.path : null;

    try {
      // Check if destination exists
      const destination = await Destination.findById(destination_id);
      if (!destination) {
        return res.status(404).json({ message: 'Destination not found' });
      }

      // Check if the client_user exists in the User (client_users) collection
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create a new review with the associated client_user
      const newReview = new Review({
        rating,
        review_title,
        comment,
        date: new Date(date),  // Ensure the date is correctly parsed
        proof,
        destination_id: destination._id,
        user_id: user._id,
      });

      // Save the review to the 'reviews' collection
      await newReview.save();

      // Return success response
      res.status(201).json({ message: 'Review submitted successfully' });
    } catch (error) {
      console.error('Error submitting review:', error); // Log the full error
      res.status(500).json({ message: 'Error submitting review', error });
    }
  });

  // Route to get all itineraries
  app.get('/itineraries', async (req, res) => {
    try {
      const itineraries = await Itinerary.find();
      res.status(200).json(itineraries);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
      res.status(500).json({ message: 'Error fetching itineraries', error });
    }
  });

  //for ratings
  app.get('/reviews/:destinationId', async (req, res) => {
    try {
      const { destinationId } = req.params;

      // Fetch all reviews for the destination and populate the 'client_user' field to get user info
      const reviews = await Review.find({ destination_id: destinationId })
        .populate({
          path: 'user_id',   // 'client_user' is the reference field in the Review schema
          select: 'firstname lastname', // Select both 'firstname' and 'lastname' fields
        });

      // Debugging step: check if the 'client_user' field is populated
      console.log("Reviews with populated client_user: ", reviews);

      const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let totalRating = 0;

      reviews.forEach(review => {
        const rating = parseFloat(review.rating);
        if (rating >= 1 && rating <= 5) {
          totalRating += rating;
          const roundedRating = Math.round(rating);
          ratingBreakdown[roundedRating] += 1;
        }
      });

      const averageRating = totalRating / reviews.length;

      // Return reviews with the populated user info
      res.status(200).json({
        reviews: reviews.map(review => ({
          name: `${review.user_id?.firstname || 'Unknown'} ${review.user_id?.lastname || 'User'}`,  // Concatenate firstname and lastname
          rating: review.rating,
          review_title: review.review_title,
          comment: review.comment,
          date: review.date,
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

  //for profile page
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

  // Get all approved destinations
  app.get('/all-destinations', async (req, res) => {
    try {
      // Find all approved destinations and sort by category
      const destinations = await Destination.find({ 
        status: 'approved' 
      }).sort({ 
        category: 1, 
        destination_name: 1 
      });

      // Add image URL to each destination
      const destinationsWithImages = destinations.map(destination => {
        const destObj = destination.toObject();
        destObj.coverphoto = destination.coverphoto ? 
          `http://146.190.87.44/images/coverphotos/${destination.coverphoto}` :
          'https://via.placeholder.com/150';
        return destObj;
      });

      if (!destinations.length) {
        return res.status(404).json({ message: 'No destinations found' });
      }

      res.status(200).json(destinationsWithImages);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      res.status(500).json({ 
        message: 'Error fetching destinations', 
        error: error.message 
      });
    }
  });

  // Route to fetch destinations based on categories
  app.post('/destinations-by-category', async (req, res) => {
    try {
      const { categories } = req.body;
      console.log('Fetching destinations for categories:', categories);

      const destinations = await Destination.find({
        category: { $in: categories },
        status: 'approved'
      });

      console.log(`Found ${destinations.length} destinations`);

      res.status(200).json(destinations);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      res.status(500).json({ message: 'Error fetching destinations', error });
    }
  });

  // Start the server
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });