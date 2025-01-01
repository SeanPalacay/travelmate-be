const express = require('express');
const WebSocket = require('ws');
const mongoose = require('mongoose');

// MongoDB connection
mongoose.connect('mongodb+srv://dbUser:12345@cluster0.dgpab.mongodb.net/project11', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Notification schema
const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  message: { type: String, required: true },
});

const Notification = mongoose.model('Notification', notificationSchema);

// Express server
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Optionally, you can still listen for messages from clients
  ws.on('message', (message) => {
    console.log('Received:', message);
    
    try {
      const { user_id } = JSON.parse(message);
      console.log(`User ID received: ${user_id}`); // For logging purposes
      // Send notifications upon connection if you wish
      sendNotifications(ws);
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format.' }));
    }
  });

  // Set up an interval to send notifications every second
  const intervalId = setInterval(() => {
    sendNotifications(ws); // Sending all notifications to the client
  }, 1000);

  // Close the connection
  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(intervalId); // Clear the interval on disconnection
  });
});

// Function to send all notifications to the client
function sendNotifications(ws) {
  Notification.find({})
    .then((notifications) => {
      if (notifications.length > 0) {
        console.log(`Sending all notifications:`, notifications);
        ws.send(JSON.stringify(notifications)); // Send notifications back to the client
      } else {
        console.log(`No notifications found.`);
      }
    })
    .catch((err) => {
      console.error('Failed to retrieve notifications:', err);
      ws.send(JSON.stringify({ error: 'Failed to retrieve notifications.' }));
    });
}

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});