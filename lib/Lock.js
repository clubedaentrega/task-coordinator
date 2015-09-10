'use strict'

/**
 * @param {Coordinator} coordinator
 * @param {Task} task
 * @param {ObjectId} runId
 * @param {Date} timeoutDateAfterRelease
 * @private
 * @class
 */
function Lock(coordinator, task, runId, timeoutDateAfterRelease) {
	/** @member {Coordinator} */
	this.coordinator = coordinator

	/** @member {Task} */
	this.task = task

	/** @member {ObjectId} */
	this.runId = runId

	/** @member {Date} */
	this.timeoutDateAfterRelease = timeoutDateAfterRelease
}

module.exports = Lock

/**
 * Release this lock
 */
Lock.prototype.release = function () {
	this.coordinator._collection.updateOne({
		_id: this.task.name,
		run: this.runId
	}, {
		$set: {
			released: true,
			timeoutDate: this.timeoutDateAfterRelease
		}
	}, {
		w: 0
	})
}