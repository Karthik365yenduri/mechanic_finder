const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mechanicfinder';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Schema
const mechanicSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
  }
});
mechanicSchema.index({ location: '2dsphere' });
const Mechanic = mongoose.model('Mechanic', mechanicSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.post('/api/register-mechanic', async (req, res) => {
  const { name, phone, address, latitude, longitude } = req.body;
  if (!name || !phone || !address || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const newMechanic = new Mechanic({
      name,
      phone,
      address,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });
    await newMechanic.save();
    res.json({ message: '✅ Mechanic registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/nearby-mechanics', async (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  try {
    const mechanics = await Mechanic.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: 10000,
          spherical: true
        }
      }
    ]);
    res.json({ mechanics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to find nearby mechanics' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
