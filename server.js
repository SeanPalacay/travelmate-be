const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://dbUser:12345@cluster0.dgpab.mongodb.net/project11')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Configure multer storage for file uploads
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

// Define schemas and models
const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

const GeneratedTripSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  tripName: { type: String, required: true },
  locality: { type: String, required: true },
  numberOfDays: { type: Number, required: true },
  groupSize: { type: Number, required: true },
  categories: [{ type: String, required: true }],
  dayWiseDestinations: [{
    destinationId: { type: String, required: true },
    destination_name: { type: String, required: true },
    coverphoto: { type: String, required: true },
    dayNumber: { type: Number, required: true },
    order: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});
const GeneratedTrip = mongoose.model('GeneratedTrip', GeneratedTripSchema, 'generated_trips');

const ReviewSchema = new mongoose.Schema({
  rating: { type: Number, required: true },
  review_title: { type: String, required: true },
  comment: { type: String, required: true },
  date: { type: Date, required: true },
  proof: { type: String },
  destination_id: { type: String, ref: 'Destination', required: true },
  user_id: { type: String, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' }
}, { timestamps: true, versionKey: false });
const Review = mongoose.model('Review', ReviewSchema, 'reviews');

const SavedDestinationSchema = new mongoose.Schema({
  user_id: { type: String, ref: 'User', required: true },
  destination_id: { type: String, ref: 'Destination', required: true },
  saved_at: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false });
const SavedDestination = mongoose.model('SavedDestination', SavedDestinationSchema, 'saved_destinations');

const UserSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  birthdate: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile_no: { type: String, required: true, unique: true },
  business_name: { type: String, default: "clientuser", required: true },
  type: { type: String, enum: ['admin', 'superadmin', 'owner', 'client'], default: 'client' },
  savedDestinations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }]
}, { timestamps: true, versionKey: false });
const User = mongoose.model('User', UserSchema, 'users');

const DestinationSchema = new mongoose.Schema({
  locality: { type: String, required: true },
  destination_name: { type: String, required: true },
  destination_address: { type: String, required: true },
  coverphoto: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, required: true },
  amenities: { type: String, required: true }
}, { timestamps: true, versionKey: false });
const Destination = mongoose.model('Destination', DestinationSchema, 'destinations');

const FareSchema = new mongoose.Schema({
  locality: { type: String, required: true },
  vehicle: { type: String, required: true },
  operating_hours: { type: String, required: true },
  distance: { type: String, required: true },
  discounted_fare: { type: String, required: true },
  regular_fare: { type: String, required: true }
}, { timestamps: true, versionKey: false });
const Fare = mongoose.model('Fare', FareSchema, 'fares');

const ItinerarySchema = new mongoose.Schema({
  locality: { type: String, required: true },
  number_days: { type: Number, required: true },
  group_size: { type: Number, required: true },
  trip_name: { type: String, required: true },
  category: { type: [String], required: true }
}, { timestamps: true, versionKey: false });
const Itinerary = mongoose.model('Itinerary', ItinerarySchema, 'itineraries');

// Routes
app.post('/notifications', async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message) return res.status(400).json({ error: 'user_id and message are required' });
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
    const notifications = await Notification.find({ user_id });
    if (notifications.length === 0) return res.status(404).json({ message: 'No notifications found for this user' });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/generated-trips', async (req, res) => {
  const { userId, tripName, locality, numberOfDays, groupSize, categories, dayWiseDestinations, createdAt } = req.body;
  if (!userId || !tripName || !locality || !numberOfDays || !groupSize || !categories) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const existingTrip = await GeneratedTrip.findOne({ userId, tripName });
    if (existingTrip) return res.status(400).json({ message: 'A trip with this name already exists for this user' });
    const newTrip = new GeneratedTrip({ userId, tripName, locality, numberOfDays, groupSize, categories, dayWiseDestinations, createdAt: createdAt || new Date() });
    await newTrip.save();
    res.status(201).json({ message: 'Trip saved successfully', trip: newTrip });
  } catch (error) {
    console.error('Error saving trip:', error);
    res.status(500).json({ message: 'Error saving trip', error: error.message });
  }
});

app.delete('/generated-trips', async (req, res) => {
  const { userId, tripName } = req.body;
  if (!userId || !tripName) return res.status(400).json({ message: 'userId and tripName are required' });
  try {
    const result = await GeneratedTrip.findOneAndDelete({ userId, tripName });
    if (!result) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ message: 'Error deleting trip', error: error.message });
  }
});

app.post('/signup', async (req, res) => {
  const { firstname, lastname, email, birthdate, mobile_no, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ firstname, lastname, email, birthdate, mobile_no, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User signed up successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) return res.status(200).json({ message: 'Login successful', userId: user._id });
    else return res.status(401).json({ message: 'Incorrect password' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});