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

	/**
	 * Number of executions to skip
	 * @member {number}
	 * @private
	 */
	this._skipCounter = 0

	/**
	 * @member {number}
	 * @private
	 */
	this._lastBackoff = 0

	this.start()
}

module.exports = Task

/**
 * Return the next datetime this task will try to run.
 * This will not start, stop nor change the current task schedule in any way.
 * This does not take into account skipped executions ordered by skip()/backoff()
 * @returns {Date}
 */
Task.prototype.getNext = function () {
	var now = Date.now(),
		next = Math.ceil((now + 1 - this.offset) / this.interval) * this.interval + this.offset
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
 * Add an exponentially increasing pause to the task execution.
 * Each consecutive backoff will increase the pause length by the given factor.
 * Call skip(N) to overwrite the backoff sequence.
 * Use skip(0) to resume normal operation.
 * @param {number} [factor=2]
 * @returns {number}
 */
Task.prototype.backoff = function (factor) {
	factor = factor || 2
	this._lastBackoff = this._skipCounter = Math.max(1, this._lastBackoff * factor)
}

/**
 * Skip the next N executions.
 * The task won't even try to communicate with the DB to acquire the lock.
 * This will overwrite any previous call to skip().
 * Use skip(0) to resume normal operation.
 * Use {@link Task#backoff} if you want to use an exponentially increasing delay.
 * @param {number} n
 */
Task.prototype.skip = function (n) {
	this._skipCounter = n
	this._lastBackoff = 0
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

	if (this._skipCounter > 0) {
		this._skipCounter -= 1
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