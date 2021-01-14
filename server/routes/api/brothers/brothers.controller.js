const express = require('express');
const brotherController = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const passport = require('passport');
const { SecretOrKey } = JSON.parse(fs.readFileSync('config/secrets.json'));

const Brother = require('./brother');
const validateRegisterInput = require('../util/form-validation/register');
const validateLoginInput = require('../util/form-validation/login');
const validateEditInput = require('../util/form-validation/edit');
const { fileMiddleware, uploadToS3 } = require('../services/upload-s3');

// Passport.js config (JWT extraction from request headers)
brotherController.use(passport.initialize());
require('../../../config/passport')(passport);

/**
 * GET Endpoint (all brothers)
 * @route GET api/brothers
 * @desc retrieve all brothers
 */
brotherController.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Brother.find({}, (error, allBrothers) => {
      if (error) {
        return res.status(404).json({ message: `No brothers found: ${error}` });
      }
      res.status(200).json(allBrothers);
    });
  }
);

/**
 * GET Endpoint (one brother)
 * @route GET api/brothers/me/:page
 * @desc retrieve all info needed about brother depending on what page
 */
brotherController.get(
  '/me/:page',
  // passport.authenticate() validates the JWT in request header and gives req.user object
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { page } = req.params;

    // Respond with only needed fields for the page
    let responseObject;
    switch (page) {
      case 'dashboard':
        responseObject = req.user;
        break;
      case 'edit':
        responseObject = {
          email: req.user.email,
          biography: req.user.biography,
          major: req.user.major,
          graduatingYear: req.user.graduatingYear,
        };
        break;
      default:
        console.error(`Unknown page parameter passed, ${page}`);
    }
    res.status(200).json(responseObject);
  }
);

/**
 * REGISTER Endpoint
 * @route POST api/brothers/register
 * @param fileMiddleware multer middleware that parses form data (for file uploads)
 * @desc register a brother
 */
brotherController.post(
  '/register',
  [fileMiddleware, passport.authenticate('jwt', { session: false })],
  async (req, res) => {
    // Form input validation
    const { errors, isValid } = validateRegisterInput(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    Brother.findOne({ email: req.body.email }, async (brother) => {
      if (brother) {
        return res.status(400).json({ email: 'Email already exists' });
      }

      // Only upload file to S3 if included in form
      let filePath;
      if (req.file) {
        let fileExtension = req.file.originalname.split('.');
        fileExtension = fileExtension[fileExtension.length - 1];
        // Prefer to use student IDs for image paths moving forward, but use phone number if missing
        filePath = req.body.studentID
          ? `${req.body.pledgeClass}/${req.body.studentID}.${fileExtension}`
          : `${req.body.pledgeClass}/${req.body.phoneNumber}.${fileExtension}`;

        await uploadToS3(
          'brother-headshots',
          filePath,
          req.file.buffer,
          req.file.mimetype
        );
      }

      const newBrother = new Brother({
        name: req.body.name,
        email: req.body.email,
        studentID: req.body.studentID,
        phoneNumber: req.body.phoneNumber,
        password: `${req.body.pledgeClass}-${req.body.graduatingYear}`,
        major: req.body.major,
        graduatingYear: req.body.graduatingYear,
        pledgeClass: req.body.pledgeClass,
        position: req.body.position,
        isGraduated: req.body.isGraduated === 'true',
        biography: '',
        imagePath: filePath,
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
  }
);

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
      jwt.sign(payload, SecretOrKey, { expiresIn: 7200 }, (error, token) => {
        if (error) {
          throw new Error(error);
        }
        res.json({
          success: true,
          token: `Bearer ${token}`,
        });
      });
    } else {
      return res.status(400).json({ password: 'Password incorrect' });
    }
  });
});

/**
 * EDIT Endpoint
 * @route PUT api/brothers/edit
 * @desc edit a bro page
 */
brotherController.put(
  '/me',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const delta = req.body;

    // Form validation
    const { errors, isValid } = validateEditInput(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    if (
      delta.password &&
      bcrypt.compareSync(delta.password, req.user.password)
    ) {
      return res.status(400).json({ password: 'Cannot reuse password' });
    }

    Object.entries(delta).forEach(([key, value]) => {
      req.user[key] = value;
    });
    req.user.save();

    res.status(200).json(req.user);
  }
);

module.exports = brotherController;
