import express from "express";
import fetch from "node-fetch";
import multer from "multer";

const router = express.Router();

// Pokemon Model
import Pokemon from "../../models/Pokemon.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // reject a file
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else cb(null, false);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: fileFilter
});

/*
 * @route POST
 * @description Create a new pokemon
 * @body Pokemon Schema {name, height, weight, abilities: Array of Objects, firstItem: Object}
 * @
 */
router.post("/pokemon", upload.single("pokemonImage"), async (req, res) => {
  console.log(req.file);
  const { name, height, weight, abilities, firstItem } = req.body;
  const pokemon = new Pokemon({
    name,
    height,
    weight,
    abilities,
    firstItem,
  });

  try {
    const newPokemon = await pokemon.save();
    res.status(201).send(newPokemon);
  } catch (err) {
    res.status(500).send(err);
  }
});

/*
 * @route GET
 * @description Retrieves all Pokemons sorted descending by weight
 */
router.get("/pokemon", async (req, res) => {
  try {
    const pokemons = await Pokemon.find().sort({ weight: -1 });
    res.status(200).send(pokemons);
  } catch (err) {
    res.status(500).send(err);
  }
});

/*
 * @route GET
 * @description Retrieves the Pokemon details of this Pokemon id
 * @param id of the Pokemon that we want to see details
 */
router.get("/pokemon/:id", async (req, res, next) => {
  try {
    const pokemon = await Pokemon.findById(req.params.id);
    res.status(200).send(pokemon);
  } catch (err) {
    res.status(500).send({ message: "No such pokemon with this ID", err: err });
  }
});

/*
 * @route PUT
 * @description Updates the Pokemon with the specified id
 * @param id of the Pokemon that we want to update
 */
router.put("/pokemon/:id", async (req, res) => {
  // check for the id of the Pokemon and update it if you find it
  try {
    const pokemon = await Pokemon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    // const pokemon = await Pokemon.findOneAndUpdate({_id: req.params.id }, req.body)
    res.status(200).send(pokemon);
  } catch (err) {
    res
      .status(500)
      .send({ message: "No such pokemon with this ID to update", err: err });
  }
});

/*
 * @route DELETE
 * @description Deletes the Pokemon with the specified id
 * @param id is the id of the Pokemon that we want to delete
 */
router.delete("/pokemon/:id", async (req, res) => {
  try {
    await Pokemon.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).send({
      message: `Error when trying to delete Pokemon with id ${req.params.id}`,
      err: err,
    });
  }
});

/*
 * @route DELETE
 * @description Deletes ALL Pokemons from the DB
 */
router.delete("/pokemon", async (req, res) => {
  try {
    const result = await Pokemon.deleteMany({});
    if (result.deletedCount == 0) {
      res.status(200).send("No deletion occurred. DB is empty.");
    } else
      res
        .status(204)
        .send(
          `Successfully deleted ALL ${result.deletedCount} Pokemons in the DB!`
        );
  } catch (err) {
    res.status(500).send(err);
  }
});

/*
 * @route GET
 * @description Populates the DB with up to 100 Pokemons from 1st Generation from PokeAPI
 */
router.get("/populate-database", (req, res) => {
  // check to see if there are 100 Pokemons
  Pokemon.countDocuments({}, (err, count) => {
    console.log(`There are ${count} in the DB.`);
    if (err) res.status(404).send(err);
    else if (count < 100) {
      const firstGen = "https://pokeapi.co/api/v2/generation/1";
      fetch(firstGen)
        .then((res) => res.json())
        .then((data) => {
          for (let i = count; i <= 100; i++) {
            const species_url = data.pokemon_species[i].url;
            // example: https://pokeapi.co/api/v2/pokemon-species/149/   --Up to 151 is 1st gen
            fetch(species_url)
              .then((res) => res.json())
              .then((data) => {
                const varieties = data.varieties;
                fetch(varieties[0].pokemon.url)
                  .then((res) => res.json())
                  .then((data) => {
                    const newPokemon = new Pokemon();
                    newPokemon.name = data.name;
                    newPokemon.height = data.height;
                    newPokemon.weight = data.weight;
                    data.abilities.forEach((ability) => {
                      newPokemon.abilities.push({
                        ability_name: ability.ability.name,
                        ability_slot: ability.slot,
                        hidden: ability.is_hidden,
                      });
                    });
                    if (data.held_items.length > 0) {
                      newPokemon.firstItem.name = data.held_items[0].item.name;
                      newPokemon.firstItem.url = data.held_items[0].item.url;
                    } else {
                      newPokemon.firstItem.name = "no_held_item";
                      newPokemon.firstItem.url = "N/A";
                    }
                    newPokemon.save();
                  });
              })
              .catch((err) => console.log(err));
          }
          res.status(200).send(`Fetched ${100 - count} of them`);
        })
        .catch((err) => console.log(err));
    } else {
      res.status(200).send(`There are enough Pokemons in the DB(${count})`);
    }
  });
});

/*
 * @route GET
 * @description Populates the DB with up to 100 Pokemons from PokeAPI
 */
router.get("/populate-database-v2", (req, res) => {
  // check to see if there are 100 Pokemons
  Pokemon.countDocuments({}, (err, count) => {
    if (err) res.status(404).send(err);
    else if (count < 100) {
      // if not import the rest of them up to 100 Pokemons
      fetch(
        `https://pokeapi.co/api/v2/pokemon?offset=${count}&limit=${100 - count}`
      )
        .then((res) => res.json())
        .then((data) => {
          data.results.forEach((pokemon) => {
            fetch(pokemon.url)
              .then((res) => res.json())
              .then((data) => {
                const newPokemon = new Pokemon();
                newPokemon.name = pokemon.name;
                newPokemon.height = data.height;
                newPokemon.weight = data.weight;
                data.abilities.forEach((ability) => {
                  newPokemon.abilities.push({
                    ability_name: ability.ability.name,
                    ability_slot: ability.slot,
                    hidden: ability.is_hidden,
                  });
                });

                if (data.held_items.length > 0) {
                  newPokemon.firstItem.name = data.held_items[0].item.name;
                  newPokemon.firstItem.url = data.held_items[0].item.url;
                } else {
                  newPokemon.firstItem.name = "no_held_item";
                  newPokemon.firstItem.url = "N/A";
                }
                newPokemon.save();
              })
              .catch((err) => console.log(err));
          });
          res.status(200).send(`Fetched ${100 - count} of them`);
        })
        .catch((err) => console.log(err));
    } else {
      res.status(200).send("There are enough (over 100) Pokemons in the DB.");
    }
  });
});

export default router;
