const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const { json } = require('express/lib/response');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});

// Define MongoDB Schemas and Models
const { Schema } = mongoose;

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now } 
});

const userSchema = new Schema({
  username: { type: String, unique: true, required: true }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// POST /api/users
// accepts form data with a username field
// returns an object with username and _id properties
app.post('/api/users', async(req,res) => {
  try {
    const { username }  = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/users 
// returns an array of user objects, each containing username and _id properties
app.get('/api/users', async(req,res) => {
  try {
    const users = await User.find({});
    res.json(users.map(user => ({ username: user.username, _id: user._id })));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/users/:_id/exercises
// accepts form data with description, duration, and date fields
// returns the user object with the exercise fields added
app.post('/api/users/:_id/exercises', async(req,res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
    const user = await User.findById(_id);
    if (!user) return res.status(404).send('User not found');

    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });
    await newExercise.save();

    // Update the user with the new exercise
    //await User.findByIdAndUpdate(_id, { $push: { exercises: newExercise._id }}, { new: true } );

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/users/:_id/logs
// returns an array of exercises log objects, each containing description, duration, and date properties
// supports optional from, to, and limit parameters
app.get('/api/users/:_id/logs', async(req,res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;
    
    const user = await User.findById(_id);
    if (!user) return res.status(404).send('User not found');

    let query = Exercise.find({ userId: _id });

    if (from) query.where('date').gte(new Date(from));
    if (to) query.where('date').lte(new Date(to));
    if (limit) query.limit(parseInt(limit));

    let exercises = await query.exec();
    console.log(exercises);

    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    
    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
