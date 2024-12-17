require('dotenv').config();
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');
const FormData = require('form-data');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Multer setup for image upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Webhook endpoint
app.post('/webhook', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body; // Text prompt
    const imageBuffer = req.file.buffer; // Uploaded image file

    // Step 1: Upload image to ImgBB
    const formData = new FormData();
    formData.append('image', imageBuffer.toString('base64'));

    const imgbbResponse = await axios.post(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      formData,
      { headers: formData.getHeaders() }
    );
    const imageUrl = imgbbResponse.data.data.url;

    // Step 2: Send prompt and image to Replicate API
    const replicateResponse = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: process.env.REPLICATE_VERSION,
        input: {
          prompt,
          image: imageUrl,
        },
      },
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const outputUrl = replicateResponse.data.output;

    // Step 3: Send response back
    res.json({
      success: true,
      imageUrl,
      resultUrl: outputUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
