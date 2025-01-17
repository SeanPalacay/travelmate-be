const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http'); // For creating an HTTP server
const WebSocket = require('ws'); // For WebSocket integration

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
    lat: {
      type: Number,
      required: false,
    },
    long: {
      type: Number,
      required: false,
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

    // Create and send a notification
    const notification = new Notification({
      user_id: userId,
      message: `Your itinerary "${tripName}" has been saved successfully!`,
    });
    await notification.save();

    // Broadcast the notification to the relevant user via WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.user_id === userId) {
        client.send(JSON.stringify([notification]));
      }
    });

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

  ws.on('message', (message) => {
    try {
      const { user_id } = JSON.parse(message);
      console.log(`User ID received: ${user_id}`);

      // Store the user_id in the WebSocket client object
      ws.user_id = user_id;

      // Send notifications specific to this user
      const intervalId = setInterval(async () => {
        const notifications = await Notification.find({ user_id });
        if (notifications.length > 0) {
          ws.send(JSON.stringify(notifications));
        }
      }, 1000);

      // Clean up when client disconnects
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        clearInterval(intervalId);
      });
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format.' }));
    }
  });
});

/****************************************************
 *  START THE SERVER (HTTP + WEBSOCKET)
 ****************************************************/
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`HTTP & WebSocket server running on port ${PORT}`);
});