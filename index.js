import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import morgan from "morgan";
import config from "./config/config.js";
import pokemons from "./routes/api/pokemons.js";
import multer from "multer";
import uploadImage from "./helpers/helpers.js";

const app = express();
const multerMid = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

//Middleware
app.use(multerMid.single("pokemonImage"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("dev"));
console.log('Herkouuu')

mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB ATLAS connected"))
  .catch((err) => console.log(err));

app.use("/api/pokemons", pokemons);

app.use("/", (req, res, next) => {
  res
    .status(200)
    .json({ message: `This works for mainpage! at path ${req.path}` });
  next();
});

app.use((req, res, next) => {
  const error = new Error(
    `Path ${req.path} not found. Please use /api/pokemons and refer to the documentation.`
  );
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    error: { message: error.message },
  });
});

app.listen(config.PORT, () => {
  console.log("Server running on port: " + config.PORT);
});
