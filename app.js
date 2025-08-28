//Importing required packages/modules
const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

//Creating express server
const app = express(); //Initializing the express application 
const PORT = process.env.PORT || 3000; //Server Port Number

//Setting up template engine
app.set('view engine', 'ejs') //Setting EJS as the template engine
app.use(express.static('public')); //Serving static files from 'public' directory

//Parsing HTML data for POST requests
app.use(express.urlencoded({
    extended: true
}))
app.use(express.json()); //Parsing JSON data

//Defining routes
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
    const wantsJson = (req.headers.accept || '').includes('application/json');
    const videoUrl = req.body.videoLink;
    const videoId = extractVideoId(videoUrl);

    if (!videoId) {
        const payload = {
            success: false,
            song_title: null,
            song_size: null,
            song_link: null,
            message: "❌ Please enter a valid YouTube link."
        };
        return wantsJson ? res.json(payload) : res.render("index", payload);
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
            const payload = {
                success: true,
                song_title: fetchResponse.title,
                song_size: formatFileSize(fetchResponse.filesize),
                song_link: fetchResponse.link,
                message: null
            };
            return wantsJson ? res.json(payload) : res.render("index", payload);
        } else {
            const payload = {
                success: false,
                song_title: null,
                song_size: null,
                song_link: null,
                message: fetchResponse.msg || "❌ Conversion failed."
            };
            return wantsJson ? res.json(payload) : res.render("index", payload);
        }
    } catch (error) {
        console.error(error);
        const payload = {
            success: false,
            song_title: null,
            song_size: null,
            song_link: null,
            message: "❌ Server error. Please try again later."
        };
        return wantsJson ? res.json(payload) : res.render("index", payload);
    }
});

//Starting the server
app.listen(PORT, () => {
    console.log('Server is running on port:' + PORT);
})


//URL Validation Function

function isValidYouTubeUrl(url) {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return regex.test(url);
}

//Function for extracting the YouTube video ID from videoUrl
function extractVideoId(url) {
    const regex = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

//Function for converting file size in raw bytes into MB or MiB
function formatFileSize(bytes) {
    if (!bytes) return null;
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"; // Convert to MB
}
