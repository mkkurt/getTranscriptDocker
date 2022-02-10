import express from "express";
import getTranscript from "./getTranscript.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
//request body parser
app.use(express.json());
app.get("/", async (req, res) => {
  //validate request body
  if (!req.body.id || !req.body.password || !req.body.pin) {
    res.status(400).send("Invalid request body");
    return;
  }
  const { id, password, pin } = req.body;
  try {
    await getTranscript(id, password, pin);
    res.sendFile(__dirname + "/transcript.pdf", (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("File sent");
        fs.unlink(__dirname + "/transcript.pdf", (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log("File deleted");
          }
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.send("Error");
  }
});
app.listen(3000, () => {
  console.log("server started on port 3000");
});
