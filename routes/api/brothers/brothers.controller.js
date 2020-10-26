const express = require('express');
const brotherController = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { SecretOrKey } = JSON.parse(fs.readFileSync('config/secrets.json'));

const Brother = require('./brother');
const validateRegisterInput = require('../util/form-validation/register');
const validateLoginInput = require('../util/form-validation/login');
const validateEditInput = require('../util/form-validation/edit');

/**
 * GET Endpoint
 * @route GET api/brothers
 * @desc retrieve all brothers
 */
brotherController.get('/', (req, res) => {
  Brother.find({}, (err, allBrothers) => {
    if (err) {
      return res.status(404).json({ message: `No brothers found: ${err}` });
    }
    res.status(200).json(allBrothers);
  });
});

/**
 * REGISTER Endpoint
 * @route POST api/brothers/register
 * @desc register a brother
 */
brotherController.post('/register', (req, res) => {
  // Form input validation
  const { errors, isValid } = validateRegisterInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }

  Brother.findOne({ email: req.body.email }).then((brother) => {
    if (brother) {
      return res.status(400).json({ email: 'Email already exists' });
    }

    const newBrother = new Brother({
      name: req.body.name,
      email: req.body.email,
      studentID: req.body.studentID,
      password: `${req.body.pledgeClass}-${req.body.graduatingYear}`,
      major: req.body.major,
      graduatingYear: req.body.graduatingYear,
      pledgeClass: req.body.pledgeClass,
      position: req.body.position,
      imagePath: `frontend/src/assets/images/headshots/${req.body.studentID}.jpg`,
    });

    // Hash password before storing in database
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newBrother.password, salt);
    newBrother.password = hash;

    newBrother
      .save()
      .then((storedBrother) => res.status(200).json(storedBrother))
      .catch((error) => {
        throw new Error(`Error: ${error}`);
      });
  });
});

/**
 * LOGIN Endpoint
 * @route POST api/brothers/login
 * @desc login a brother
 */
brotherController.post('/login', (req, res) => {
  // Form input validation
  const { errors, isValid } = validateLoginInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }

  Brother.findOne({ email: req.body.email }).then((brother) => {
    if (!brother) {
      return res.status(404).json({ emailnotfound: 'Email not found' });
    }

    const isMatch = bcrypt.compareSync(req.body.password, brother.password);
    if (isMatch) {
      // Create JWT payload
      const payload = {
        id: brother.id,
        name: brother.name,
      };
      // Sign token
      jwt.sign(
        payload,
        SecretOrKey,
        { expiresIn: 31556926 },
        (error, token) => {
          if (error) {
            throw new Error(error);
          }
          res.json({
            success: true,
            token: `Bearer ${token}`,
          });
        }
      );
    } else {
      return res.status(400).json({ passwordincorrect: 'Password incorrect' });
    }
  });
});

/**
 * EDIT Endpoint
 * @route PUT api/brothers/edit
 * @desc edit a bro page
 */
brotherController.put('/:brotherID', (req, res) => {
  // Form validation
  const { errors, isValid } = validateEditInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }

  Brother.findById(req.params.brotherID, (err, foundBrother) => {
    if (err) {
      return console.log(`Could not find the Brother in the DB: ${err}`);
    }

    // update brother password, bio, email, major, position, gradYear
    const newPassword = req.body.password;
    const newBio = req.body.biography;
    const newEmail = req.body.email;
    const newMajor = req.body.major;
    const newPosition = req.body.position;
    const newGradYear = req.body.graduatingYear;

    // Account for empty fields
    if (newPassword !== '') {
      foundBrother.password = newPassword;
    }
    if (newBio !== '') {
      foundBrother.biography = newBio;
    }
    if (newEmail !== '') {
      foundBrother.email = newEmail;
    }
    if (newMajor !== '') {
      foundBrother.major = newMajor;
    }
    if (newPosition !== '') {
      foundBrother.position = newPosition;
    }
    if (newGradYear !== '') {
      foundBrother.graduatingYear = newGradYear;
    }
    foundBrother.save();
    res.json({
      updatedPassword: newPassword,
      updatedBiography: newBio,
      updatedEmail: newEmail,
      updatedMajor: newMajor,
      updatedPosition: newPosition,
      updatedGradYear: newGradYear,
    });
  });
});

module.exports = brotherController;
