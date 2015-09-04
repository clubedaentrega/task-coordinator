'use strict'

/**
 * @param {Coordinator} coordinator
 * @param {Task} task
 * @param {string} runId
 * @private
 * @class
 */
function Lock(coordinator, task, runId) {
	/** @member {Coordinator} */
	this.coordinator = coordinator

	/** @member {Task} */
	this.task = task

	/** @member {string} */
	this.runId = runId
}

module.exports = Lock

/**
 * Release this lock
 */
Lock.prototype.release = function () {
	this.coordinator._collection.deleteOne({
		_id: this.task.name,
		runId: this.runId
	})
}