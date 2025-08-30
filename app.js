// Importing required packages/modules
const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

// Creating express server
const app = express();
const PORT = process.env.PORT || 3000;

//force to run https

app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// Setting up template engine
app.set("view engine", "ejs");
app.use(express.static("public"));

// Parsing HTML data for POST requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Defining routes

app.get("/contact", (req, res) => {
  res.render("contact");
});

app.get("/copyright-claims", (req, res) => {
  res.render("copyright-claims");
});

app.get("/privacy", (req, res) => {
  res.render("privacy");
});

app.get("/terms", (req, res) => {
  res.render("terms");
});

app.get("/", (req, res) => {
  res.render("index", {
    success: undefined,
    song_title: null,
    song_size: null,
    song_link: null,
    message: null
  });
});

app.post("/convert-mp3", async (req, res) => {
  const videoUrl = req.body.videoLink;

  if (!isValidYouTubeUrl(videoUrl)) {
    return res.json({
      success: false,
      song_title: null,
      song_size: null,
      song_link: null,
      message: "❌ Please enter a valid YouTube link."
    });
  }

  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return res.json({
      success: false,
      song_title: null,
      song_size: null,
      song_link: null,
      message: "❌ Could not extract video ID."
    });
  }

  try {
    const fetchAPI = await fetch(
      `https://${process.env.API_HOST}/dl?id=${videoId}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": process.env.API_KEY,
          "x-rapidapi-host": process.env.API_HOST
        }
      }
    );

    const fetchResponse = await fetchAPI.json();
    console.log("API Response:", fetchResponse);

    if (fetchResponse.status === "ok") {
      return res.json({
        success: true,
        song_title: fetchResponse.title,
        song_size: formatFileSize(fetchResponse.filesize),
        song_link: fetchResponse.link,
        message: null
      });
    } else {
      return res.json({
        success: false,
        song_title: null,
        song_size: null,
        song_link: null,
        message: fetchResponse.msg || "❌ Conversion failed."
      });
    }
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      song_title: null,
      song_size: null,
      song_link: null,
      message: "❌ Server error. Please try again later."
    });
  }
});

// Starting the server
app.listen(PORT, () => {
  console.log("Server is running on port: " + PORT);
});

// URL Validation Function
function isValidYouTubeUrl(url) {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return regex.test(url);
}

// Function for extracting the YouTube video ID from videoUrl
function extractVideoId(url) {
  const regex = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Function for converting file size in raw bytes into MB
function formatFileSize(bytes) {
  if (!bytes) return null;
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}