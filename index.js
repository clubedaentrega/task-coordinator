'use strict'

var Coordinator = require('./lib/Coordinator')

/**
 * @see Coordinator
 * @param {Object} db
 * @param {Object} [options]
 */
module.exports = function (db, options) {
	return new Coordinator(db, options)
}