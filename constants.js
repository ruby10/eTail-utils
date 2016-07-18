
'use strict'
var CONSTANTS = {
  HERCULES_BASE_URL = 'https://api.integrator.io'
}

if(process.env.NODE_ENV === 'staging') {
  CONSTANTS.HERCULES_BASE_URL = 'https://api.staging.integrator.io'
} else if {
  CONSTANTS.HERCULES_BASE_URL = 'http://api.localhost.io:5000'
}

module.exports = CONSTANTS
