const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 🔗 Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/mechanicfinder', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// 🛠️ Mechanic Schema
const mechanicSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [lng, lat]
  }
});

// Enable geospatial index
mechanicSchema.index({ location: '2dsphere' });

const Mechanic = mongoose.model('Mechanic', mechanicSchema);

// 🧠 Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔧 Register a Mechanic
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
    res.json({ message: 'Mechanic registered successfully' });
  } catch (err) {
    console.error('Error registering mechanic:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 📍 Find Nearby Mechanics (within 10 km)
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
          maxDistance: 10000, // 10 km
          spherical: true
        }
      }
    ]);

    res.json({ mechanics });
  } catch (err) {
    console.error('Error finding nearby mechanics:', err);
    res.status(500).json({ error: 'Failed to find nearby mechanics' });
  }
});

// 🌍 Get All Mechanics (for map)
app.get('/api/all-mechanics', async (req, res) => {
  try {
    const mechanics = await Mechanic.find({});
    res.json({ mechanics });
  } catch (err) {
    console.error('Error fetching mechanics:', err);
    res.status(500).json({ error: 'Failed to load mechanics' });
  }
});

 
// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Mechanic Finder API is running at http://localhost:${PORT}`);
});
