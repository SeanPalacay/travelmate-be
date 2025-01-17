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
  .connect('mongodb+srv://dbUser:12345@cluster0.dgpab.mongodb.net/project11', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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

// --- Itinerary Schema/Model ---
const ItinerarySchema = new mongoose.Schema(
  {
    locality: { type: String, required: true },
    number_days: { type: Number, required: true },
    group_size: { type: Number, required: true },
    trip_name: { type: String, required: true },
    category: { type: [String], required: true },
    user_id: { type: String, required: true }, // Add user_id to associate itineraries with users
  },
  { timestamps: true, versionKey: false }
);
const Itinerary = mongoose.model('Itinerary', ItinerarySchema, 'itineraries');

/****************************************************
 *  EXPRESS ROUTES
 ****************************************************/

// 1) Save itinerary
app.post('/save-itinerary', async (req, res) => {
  const { locality, number_days, group_size, trip_name, category, user_id } = req.body;
  try {
    // Find destinations by locality
    const destinations = await Destination.find({
      locality: { $regex: locality, $options: 'i' },
    }).limit(10);

    if (destinations.length === 0) {
      return res.status(404).json({ message: 'No destinations found for this locality' });
    }

    // Create a new itinerary
    const newItinerary = new Itinerary({
      locality,
      number_days,
      group_size,
      trip_name,
      category,
      user_id, // Associate the itinerary with the user
    });
    const savedItinerary = await newItinerary.save();
    console.log('Saved Itinerary:', savedItinerary);

    // Create a notification for the user
    const notificationMessage = `Your itinerary "${trip_name}" has been saved successfully!`;
    const notification = new Notification({
      user_id,
      message: notificationMessage,
    });
    await notification.save();

    // Broadcast the notification to the user via WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'notification',
            data: { user_id, message: notificationMessage },
          })
        );
      }
    });

    res.status(201).json(savedItinerary);
  } catch (error) {
    console.error('Error saving itinerary:', error);
    res.status(500).json({ message: 'Error saving itinerary', error });
  }
});

// 2) Get all itineraries for a user
app.get('/itineraries/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const itineraries = await Itinerary.find({ user_id });
    res.status(200).json(itineraries);
  } catch (error) {
    console.error('Error fetching itineraries:', error);
    res.status(500).json({ message: 'Error fetching itineraries', error });
  }
});

// 3) Get all notifications for a user
app.get('/notifications/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const notifications = await Notification.find({ user_id });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error });
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

  // Handle messages from the client
  ws.on('message', (message) => {
    console.log('Received:', message);
    try {
      const { user_id } = JSON.parse(message);
      console.log(`User ID received: ${user_id}`);
      // You can use this user_id to send targeted notifications
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format.' }));
    }
  });

  // Clean up when client disconnects
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

/****************************************************
 *  START THE SERVER (HTTP + WEBSOCKET)
 ****************************************************/
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`HTTP & WebSocket server running on port ${PORT}`);
});