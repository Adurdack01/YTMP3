const express = require("express");
const path = require("path");
require("dotenv").config();
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public"))); // serves all static files automatically
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Pages with SEO data ---
app.get("/", (req, res) => {
  res.render("index", {
    success: undefined,
    song_title: null,
    song_size: null,
    song_link: null,
    message: null,
    seo: {
      title: "YT2MP3 • YouTube to MP3 Converter",
      description: "Convert YouTube videos to MP3 instantly. Free, secure, no registration required. Works on all devices and browsers."
    },
    disclaimer: "Only download videos licensed under Creative Commons or that you own."
  });
});

app.get("/contact", (req, res) => {
  res.render("contact", {
    seo: {
      title: "Contact • YT2MP3",
      description: "Contact YT2MP3 for questions or support."
    }
  });
});

app.get("/copyright-claims", (req, res) => {
  res.render("copyright-claims", {
    seo: {
      title: "Copyright Claims • YT2MP3",
      description: "Copyright infringement claims and DMCA notice."
    }
  });
});

app.get("/privacy", (req, res) => {
  res.render("privacy", {
    seo: {
      title: "Privacy Policy • YT2MP3",
      description: "YT2MP3 privacy practices, data collection, and user rights."
    }
  });
});

app.get("/terms", (req, res) => {
  res.render("terms", {
    seo: {
      title: "Terms of Use • YT2MP3",
      description: "YT2MP3 Terms of Use and legal conditions for service use."
    }
  });
});

// --- Convert MP3 route ---
app.post("/convert-mp3", async (req, res) => {
  const videoUrl = req.body.videoLink;

  if (!/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(videoUrl)) {
    return res.json({ success: false, message: "Please enter a valid YouTube link." });
  }

  const match = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  const videoId = match ? match[1] : null;

  if (!videoId) return res.json({ success: false, message: "Could not extract video ID." });

  try {
    const apiUrl = `https://${process.env.API_HOST}/dl?id=${videoId}&format=mp3&type=audio`;

    const fetchAPI = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.API_KEY,
        "x-rapidapi-host": process.env.API_HOST
      }
    });

    const data = await fetchAPI.json();

    if (data.status === "ok" && data.link) {
      return res.json({
        success: true,
        song_title: data.title,
        song_size: (data.filesize / (1024 * 1024)).toFixed(2) + " MB",
        song_link: data.link
      });
    } else {
      return res.json({ success: false, message: data.msg || "Conversion failed. Please try again." });
    }
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error. Please try again later." });
  }
});

app.get("/sitemap-nemo.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "sitemap-nemo.xml"));
});

// --- Start server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));