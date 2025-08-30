const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const { SitemapStream, streamToPromise } = require("sitemap");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Force HTTPS and primary domain
app.use((req, res, next) => {
  const host = req.headers.host;

  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return next();
  }

  if (req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect("https://" + host + req.url);
  }

  if (host === "acdigi.icu") {
    return res.redirect(301, "https://yt2mp3s-converter.acdigi.icu" + req.url);
  }

  next();
});

// Template engine and static files
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Sitemap ---
function getAllRoutes(app) {
  const routes = [];
  app._router.stack.forEach(m => {
    if (m.route && m.route.path && m.route.methods.get) {
      routes.push(m.route.path);
    } else if (m.name === "router") {
      m.handle.stack.forEach(h => {
        if (h.route && h.route.path && h.route.methods.get) routes.push(h.route.path);
      });
    }
  });
  return routes;
}

app.get("/sitemap.xml", async (req, res) => {
  try {
    const hostname = "https://yt2mp3s-converter.acdigi.icu";
    const sitemap = new SitemapStream({ hostname });
    getAllRoutes(app).forEach(url => {
      if (!url.includes(":")) {
        let priority = 0.5, changefreq = "monthly";
        if (url === "/") { priority = 1.0; changefreq = "daily"; }
        else if (url.includes("contact")) { priority = 0.8; changefreq = "monthly"; }
        else if (url.includes("privacy") || url.includes("terms") || url.includes("copyright")) {
          priority = 0.5; changefreq = "yearly";
        }
        sitemap.write({ url, priority, changefreq });
      }
    });
    sitemap.end();
    const xmlData = await streamToPromise(sitemap);
    res.header("Content-Type", "application/xml");
    res.send(xmlData.toString());
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// Robots.txt
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.sendFile(path.join(__dirname, "public", "robots.txt"));
});

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
    disclaimer: "⚠️ Only download videos licensed under Creative Commons or that you own."
  });
});

app.get("/contact", (req, res) => res.render("contact", {
  seo: { title: "Contact • YT2MP3", description: "Contact YT2MP3 for questions or support." }
}));
app.get("/copyright-claims", (req, res) => res.render("copyright-claims", {
  seo: { title: "Copyright Claims • YT2MP3", description: "Copyright infringement claims and DMCA notice." }
}));
app.get("/privacy", (req, res) => res.render("privacy", {
  seo: { title: "Privacy Policy • YT2MP3", description: "YT2MP3 privacy practices, data collection, and user rights." }
}));
app.get("/terms", (req, res) => res.render("terms", {
  seo: { title: "Terms of Use • YT2MP3", description: "YT2MP3 Terms of Use and legal conditions for service use." }
}));

// --- Convert MP3 route ---
app.post("/convert-mp3", async (req, res) => {
  const videoUrl = req.body.videoLink;

  if (!isValidYouTubeUrl(videoUrl)) {
    return sendResponse(res, false, null, null, null, "❌ Please enter a valid YouTube link.");
  }

  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return sendResponse(res, false, null, null, null, "❌ Could not extract video ID.");
  }

  try {
    // ✅ Added format and type params to improve API success
    const apiUrl = `https://${process.env.API_HOST}/dl?id=${videoId}&format=mp3&type=audio`;
    console.log("Fetching API:", apiUrl);

    const fetchAPI = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.API_KEY,
        "x-rapidapi-host": process.env.API_HOST
      }
    });

    const data = await fetchAPI.json();
    console.log("API response:", data); // 🔎 Debug log

    if (data.status === "ok" && data.link) {
      return sendResponse(
        res,
        true,
        data.title,
        formatFileSize(data.filesize),
        data.link
      );
    } else {
      return sendResponse(
        res,
        false,
        null,
        null,
        null,
        data.msg || "❌ Conversion failed. Please try again."
      );
    }
  } catch (err) {
    console.error("API error:", err);
    return sendResponse(res, false, null, null, null, "❌ Server error. Please try again later.");
  }
});

// --- Helper Functions ---
function sendResponse(res, success, title, size, link, message = null) {
  res.json({ success, song_title: title, song_size: size, song_link: link, message });
}
function isValidYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
}
function extractVideoId(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  return match ? match[1] : null;
}
function formatFileSize(bytes) {
  return bytes ? (bytes / (1024*1024)).toFixed(2) + " MB" : null;
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));