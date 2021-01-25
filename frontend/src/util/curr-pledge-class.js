const { PledgeClassEnum } = require('./enums/brother-enums');

/* No pledge class: set to null, otherwise use the enum */
const CURR_PLEDGE_CLASS = PledgeClassEnum.GAMMA;

module.exports = CURR_PLEDGE_CLASS;
