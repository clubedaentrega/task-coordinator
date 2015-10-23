'use strict'

/**
 * Represent a task. You don't instantiate this class directly, instead you should use {@link Coordinator#schedule}
 * @param {Coordinator} coordinator
 * @param {string} name
 * @param {number} interval
 * @param {number} offset
 * @param {number} timeout
 * @param {Coordinator~runTask} fn
 * @class
 */
function Task(coordinator, name, interval, offset, timeout, fn) {
	/** @member {Coordinator} */
	this.coordinator = coordinator

	/** @member {string} */
	this.name = name

	/** @member {number} */
	this.interval = interval

	/** @member {number} */
	this.offset = offset

	/** @member {number} */
	this.timeout = timeout

	/** @member {Coordinator~runTask} */
	this.fn = fn

	/** @member {boolean} */
	this.running = false

	/**
	 * Task timer
	 * @member {Timer}
	 * @private
	 */
	this._timer = null

	this.start()
}

module.exports = Task

/**
 * Return the next datetime this task will try to run.
 * This will not start, stop nor change the current task schedule in any way
 * @returns {Date}
 */
Task.prototype.getNext = function () {
	var now = Date.now(),
		next = Math.ceil((now + 1) / this.interval) * this.interval + this.offset
	return new Date(next)
}

/**
 * Stop scheduling this task.
 * Note that this will *not* stop a currently running operation
 */
Task.prototype.stop = function () {
	clearTimeout(this._timer)
}

/**
 * Schedule next execution for this task and return the execution date
 * @returns {Date}
 */
Task.prototype.start = function () {
	var next = this.getNext()

	clearTimeout(this._timer)
	this._timer = setTimeout(this._run.bind(this), next.getTime() - Date.now())

	return next
}

/**
 * Try to acquire lock and run the task
 * @private
 */
Task.prototype._run = function () {
	var that = this,
		nextDate

	nextDate = this.start()

	if (this.running) {
		return
	}
	this.running = true

	this.coordinator._acquireLock(this, nextDate, function (lock) {
		var timeoutTimer

		if (!lock) {
			// Someone elsewhere took the lock
			that.running = false
			return
		}

		// Set timeout interval
		if (that.timeout) {
			timeoutTimer = setTimeout(that._handleTimeout.bind(that), that.timeout)
			timeoutTimer.unref()
		}

		// Jump to user code
		var released = false
		that.fn(function () {
			if (released) {
				// Ops, double releasing is not allowed
				throw new Error('Lock already released')
			}
			released = true

			that.running = false
			clearTimeout(timeoutTimer)
			lock.release()
		})
	})
}

/**
 * Detect timeouts. This is probably because the user forgot to call done()
 * @private
 */
Task.prototype._handleTimeout = function () {
	this.running = false
	this.coordinator.emit('timeout', this)
}