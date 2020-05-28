import mongoose from 'mongoose'
const Schema = mongoose.Schema

const PokemonSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    weight: {
        type: Number,
        required: true
    },
    // Transform abilities into it's own Schema
    abilities: [
        {
          ability_name: String,
          ability_slot: Number,
          hidden: Boolean
        }
    ],
    firstItem: {
        name: String,
        url: String
    },
    pokemonImage: String
})
const Pokemon = mongoose.model('pokemon', PokemonSchema)
export default Pokemon