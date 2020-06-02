import express from "express";
import fetch from "node-fetch";
import uploadImage from '../../helpers/helpers.js'

const router = express.Router();

// Pokemon Model
import Pokemon from "../../models/Pokemon.js";

/*
 * @route POST
 * @description Create a new pokemon
 * @body Pokemon Schema {name, height, weight, abilities: Array of Objects, firstItem: Object}
 * @
 */
router.post("/pokemon", async (req, res) => {
  let pokemonURL = null;
  if (req.file != undefined) {
    const myFile = req.file
    // we have a Image attached
    const imageUrl = await uploadImage(myFile)
    pokemonURL = imageUrl
  }
  console.log(req.body)
  const { name, height, weight, abilities, firstItem } = req.body;
  const pokemon = new Pokemon({
    name,
    height,
    weight,
    abilities: req.file != undefined ? JSON.parse(abilities) : abilities,
    firstItem: req.file != undefined ? JSON.parse(firstItem) : abilities
  });
  if(pokemonURL != null) {
    pokemon.firstItem.url = pokemonURL
  }
  try {
    const newPokemon = await pokemon.save();
    res.status(201).send(newPokemon);
  } catch (err) {
    if (err.name == "ValidationError") res.status(400).send(err.message);
    else res.status(500).send(err.message);
  }
});

/*
 * @route GET
 * @description Retrieves all Pokemons sorted descending by weight
 */
router.get("/", async (req, res) => {
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
router.get("/pokemon/:id", async (req, res) => {
  try {
    const pokemon = await Pokemon.findById(req.params.id);
    if (pokemon != null) res.status(200).send(pokemon);
    else
      res
        .status(404)
        .send(`No Pokemon with id: ${req.params.id} was found in the DB.`);
  } catch (err) {
    res.status(500).send(err);
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
    if (pokemon != null) res.status(200).send(pokemon);
    else
      res
        .status(404)
        .send(`No Pokemon with id ${req.params.id} was found in the DB`);
    // const pokemon = await Pokemon.findOneAndUpdate({_id: req.params.id }, req.body)
  } catch (err) {
    res
      .status(500)
      .send({
        message: `Error when updating the Pokemon with id ${req.params.id}`,
        err: err.message,
      });
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
router.delete("/", async (req, res) => {
  try {
    const result = await Pokemon.deleteMany({});
    if (result.deletedCount == 0) {
      res.status(200).send("No deletion occurred. DB is empty.");
    } else
      res
        .status(200)
        .send(
          `Successfully deleted ALL ${result.deletedCount} Pokemons in the DB!`
        );
  } catch (err) {
    res.status(500).send(err);
  }
});

/*
 * @route GET
 * @description Populates the DB with up to 100 Pokemons from 1st Generation from PokeAPI, Will get duplicates when repopulating
 */
router.get("/populate-database-v2", (req, res) => {
  // check to see if there are 100 Pokemons
  Pokemon.countDocuments({}, (err, count) => {
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
 * @description Populates the DB with up to 100 Pokemons from PokeAPI. No duplicate Pokemons when repopulating
 */
router.get("/populate-database", async (req, res) => {
  try {
    let count = await Pokemon.countDocuments({});
    let toFetch = 100 - count;
    if (count >= 100)
      res
        .status(200)
        .send(
          `There are ${count} Pokemon in the DB. No need to populate DB with more.`
        );
    else {
      // fetch 100-count 1st Generation Pokemons from the API
      const firstGen = "https://pokeapi.co/api/v2/generation/1";
      const response = await fetch(firstGen);
      const data = await response.json();
      let i = 0;

      while (count < 100) {
        const species_url = data.pokemon_species[i].url;
        // example: https://pokeapi.co/api/v2/pokemon-species/149/   --Up to 151 is 1st gen
        const res = await fetch(species_url);
        const specie = await res.json();
        const pokemonName = specie.varieties[0].pokemon.name;
        const pokemonURL = specie.varieties[0].pokemon.url;
        // check for duplicate Pokemon in DB
        const result = await Pokemon.findOne({ name: pokemonName });
        if (result === null) {
          // New Pokemon
          const pokemonDetails = await (await fetch(pokemonURL)).json();
          const newPokemon = new Pokemon();
          newPokemon.name = pokemonDetails.name;
          newPokemon.height = pokemonDetails.height;
          newPokemon.weight = pokemonDetails.weight;
          pokemonDetails.abilities.forEach((ability) => {
            newPokemon.abilities.push({
              ability_name: ability.ability.name,
              ability_slot: ability.slot,
              hidden: ability.is_hidden,
            });
          });
          if (pokemonDetails.held_items.length > 0) {
            newPokemon.firstItem.name = pokemonDetails.held_items[0].item.name;
            newPokemon.firstItem.url = pokemonDetails.held_items[0].item.url;
          } 
          newPokemon.save();
          count++;
        }
        i++;
      }
      res
        .status(200)
        .send(
          `Fetched ${toFetch} new Pokemons and ignored ${
            i - toFetch
          } duplicate Pokemons`
        );
    }
  } catch (error) {
    console.log(error);
    res.send(error.message);
  }
});

export default router;
