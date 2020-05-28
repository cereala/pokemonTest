import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import morgan from 'morgan'
import config from './config/config.js'
import pokemons from './routes/api/pokemons.js'

const app = express()
//Middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(morgan('dev'))

mongoose
    .connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB ATLAS connected'))
    .catch(err => console.log(err))

app.use('/api/pokemons', pokemons)

app.use((req, res, next) => {
    const error = new Error('Path not found. Please use /api/pokemons and refer to the documentation.')
    error.status = 404
    next(error)
})

app.use((error, req, res, next) => {
    res.status(error.status || 500)
       .json({
           error: {message: error.message}
       })
})

app.listen(config.PORT, () => {
    console.log('Server running on port: ' + config.PORT)
})
