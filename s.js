const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the admin panel from the /public directory.
app.use(express.static(path.join(__dirname, 'public')));

// Utility function to read keys from key.json.
function readKeys() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'key.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If key.json doesn't exist or is invalid, return an empty object.
    return {};
  }
}

// Utility function to write keys to key.json.
function writeKeys(keys) {
  fs.writeFileSync(path.join(__dirname, 'key.json'), JSON.stringify(keys, null, 2));
}

// API endpoint to generate a new key.
app.post('/api/generate-key', (req, res) => {
  const keys = readKeys();
  // Generate a random key (16 hex characters).
  const key = crypto.randomBytes(8).toString('hex');
  // Set expiry to 24 hours from now (in milliseconds).
  const expiry = Date.now() + 24 * 60 * 60 * 1000;
  
  // Store the new key with its expiry and an empty devices array.
  keys[key] = { expiry, devices: [] };
  writeKeys(keys);

  res.json({ key, expiry });
});

// API endpoint to verify a key.
app.post('/api/verify-key', (req, res) => {
  const { key, deviceId } = req.body;
  if (!key) {
    return res.status(400).json({ valid: false, message: "Key is required." });
  }
  
  const keys = readKeys();
  if (!keys[key]) {
    return res.status(404).json({ valid: false, message: "Invalid key." });
  }
  
  const keyData = keys[key];
  
  // Check if the key has expired.
  if (Date.now() > keyData.expiry) {
    return res.status(401).json({ valid: false, message: "Key expired." });
  }
  
  // Optionally, register or verify the device.
  if (deviceId) {
    if (!keyData.devices.includes(deviceId)) {
      keyData.devices.push(deviceId);
      writeKeys(keys);
    }
  }
  
  res.json({ valid: true, message: "Key verified.", expiry: keyData.expiry });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
