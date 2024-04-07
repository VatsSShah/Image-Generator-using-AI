import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { OpenAI } from "openai";
import { config, uploader } from "cloudinary";

const app = express();
const PORT = 3000;

// Load environment variables
dotenv.config();

// Configure Cloudinary
config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Cors options
const corsOptions = {
  origin: "http://localhost:5173",
};

// Middlewares
app.use(express.json());
app.use(cors(corsOptions));

// Gallery model
const gallerySchema = new mongoose.Schema(
  {
    prompt: String,
    url: String,
    public_id: String,
  },
  { timestamps: true }
);
const Gallery = mongoose.model("Gallery", gallerySchema);

// Route to generate image
app.post("/generate-image", async (req, res) => {
  const { prompt } = req.body;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    // Save the image into Cloudinary
    const image = await uploader.upload(imageResponse.data[0].url, {
      folder: "ai-art-work",
    });

    // Save into MongoDB
    const imageCreated = await Gallery.create({
      prompt: imageResponse.data[0].revised_prompt,
      url: imageResponse.data[0].url,
      public_id: image.public_id,
    });

    // Respond with image URL
    res.json({ url: imageResponse.data[0].url });
  } catch (error) {
    console.error("Error generating image:", error.message);
    res
      .status(500)
      .json({ message: "Error generating image", error: error.message });
  }
});

// Route to list images
app.get("/images", async (req, res) => {
  try {
    const images = await Gallery.find();
    res.json(images);
  } catch (error) {
    console.error("Error fetching images:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching images", error: error.message });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
