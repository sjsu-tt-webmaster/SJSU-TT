const Validator = require('validator');
const isEmpty = require('is-empty');

/**
 * Converts all empty fields in request body to empty strings for Validator
 * @param requestBody the data object holding all form inputs as fields
 */
function convertFieldsToString(requestBody) {
  const sanitizedData = requestBody;
  Object.keys(sanitizedData).forEach((key) => {
    sanitizedData[key] = !isEmpty(sanitizedData[key]) ? sanitizedData[key] : '';
    // Casting number input to string
    if (typeof sanitizedData[key] === 'number') {
      sanitizedData[key] = String(sanitizedData[key]);
    }
  });
  return sanitizedData;
}

/**
 * Takes in edit form input and checks for validity
 * @param requestBody the data object holding all form inputs as fields
 */
function validateEditInput(requestBody) {
  const errors = {};

  // Convert empty fields to empty strings (Validator only works with strings)
  const data = convertFieldsToString(requestBody);

  // Only validate email and gradYear because they have more strict input
  if (!isEmpty(data.email) && !Validator.isEmail(data.email)) {
    errors.email = 'Email field must be valid';
  }
  if (!isEmpty(data.graduatingYear)) {
    if (!Validator.isNumeric(data.graduatingYear)) {
      errors.graduatingYear = 'Graduate year must be a number';
    } else if (!Validator.isLength(data.graduatingYear, { min: 4, max: 4 })) {
      errors.graduatingYear = 'Graduate year must be valid year';
    }
  }
  return {
    errors,
    isValid: isEmpty(errors),
  };
}

module.exports = validateEditInput;
