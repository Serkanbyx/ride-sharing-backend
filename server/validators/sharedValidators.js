const { body } = require('express-validator');

const forbiddenFields = (fields) =>
  fields.map((field) =>
    body(field)
      .not()
      .exists()
      .withMessage(`${field} cannot be set directly`)
  );

module.exports = {
  forbiddenFields,
};
