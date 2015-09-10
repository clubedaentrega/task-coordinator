'use strict'

var Task = require('./Task'),
	Lock = require('./Lock'),
	EventEmitter = require('events').EventEmitter,
	ObjectId = require('bson').ObjectID

/**
 * A task running on this instance timeouted
 * It may have crashed before calling done() or just forgot to do so
 * @event Coordinator#timeout
 * @type {Task}
 */

/**
 * Acquired a lock that timeouted
 * The task may be running somewhere else
 * @event Coordinator#possibleOverrun
 * @type {Task}
 */

/**
 * Create a coordinator using the given mongodb driver connection.
 * If you're using mongoose, you can access it with `mongoose.db`.
 * @param {Object} db
 * @param {Object} [options]
 * @param {string} [options.collection='_tasks'] - collection to use
 * @extends EventEmitter
 * @class
 */
function Coordinator(db, options) {
	EventEmitter.call(this)

	options = options || {}

	/** @member {Object} */
	this.db = db

	/**
	 * MongoDB collection
	 * @member {Object}
	 * @private
	 */
	this._collection = db.collection(options.collection || '_tasks', {
		w: 1,
		j: true,
		readPreference: 'primary'
	})

	/**
	 * @member {ObjectId}
	 * @private
	 */
	this._id = new ObjectId
}

require('util').inherits(Coordinator, EventEmitter)

module.exports = Coordinator

/**
 * Task implementation
 * @callback Coordinator~runTask
 * @param {Coordinator~taskDone} done
 */

/**
 * Tell the coordinator the task has completed
 * @callback Coordinator~taskDone
 */

/**
 * Schedule a task to run at a fixed interval
 * @param {Object} options
 * @param {string} options.name - task name. Only one instance of this task will run at a time
 * @param {number} options.interval - timer interval (in ms) to repeat the task
 * @param {number} [options.timeout] - lock expire time. Default is 10 times more than the interval. Set to 0 to disable timeout
 * @param {Coordinator~runTask} fn
 * @returns {Task}
 */
Coordinator.prototype.schedule = function (options, fn) {
	if (!options || typeof options !== 'object') {
		throw new Error('Options should be an object')
	} else if (typeof options.name !== 'string') {
		throw new Error('Task name should be a string')
	} else if (typeof options.interval !== 'number') {
		throw new Error('Task interval should be a number')
	} else if (options.timeout !== undefined && typeof options.timeout !== 'number') {
		throw new Error('Task timeout should be a number')
	} else if (typeof fn !== 'function') {
		throw new Error('Expected a function')
	}

	var timeout = options.timeout === undefined ? 10 * options.interval : options.timeout
	return new Task(this, options.name, options.interval, timeout, fn)
}

/**
 * Try to acquire a lock for this interval and then for the task
 * @param {Task} task
 * @param {Date} nextDate
 * @param {function(?Lock)} callback
 * @private
 */
Coordinator.prototype._acquireLock = function (task, nextDate, callback) {
	var runId = new ObjectId,
		now = new Date,
		timeoutDate = new Date(now.getTime() + task.timeout),
		that = this

	// Get lock for this task with the timeout
	this._collection.findOneAndUpdate({
		_id: task.name,
		timeoutDate: {
			$lt: now
		}
	}, {
		$set: {
			coordinator: this._id,
			run: runId,
			timeoutDate: timeoutDate,
			released: false
		}
	}, {
		upsert: true
	}, function (err, result) {
		if (err) {
			return callback()
		}

		if (result.value && !result.value.released) {
			// Acquired a timeout lock
			that.emit('possibleOverrun', task)
		}

		callback(new Lock(that, task, runId, nextDate))
	})
}