/*global describe, it, before, after*/
'use strict'

var should = require('should'),
	taskCoordinator = require('../'),
	mongodb = require('mongodb'),
	ev = new(require('events').EventEmitter)

describe('Coordinator', function () {
	var shouldFinish = true,
		db, coordinator, task, task2

	before(function (done) {
		mongodb.MongoClient.connect('mongodb://localhost:27017/test', function (err, _db) {
			should(err).be.null()
			db = _db
			db.dropCollection('_tasks', function (err) {
				if (err && err.message !== 'ns not found') {
					throw err
				}
				done()
			})
		})
	})

	it('should instantiate a coordinator', function () {
		coordinator = taskCoordinator(db)
	})

	it('should schedule a task', function () {
		task = coordinator.schedule({
			name: 'my task 2',
			interval: 500,
			timeout: 1e3
		}, function (done) {
			task.stop()
			if (shouldFinish) {
				done()
			}
			ev.emit('run')
		})
		task.stop()
	})

	it('should execute the task', function (done) {
		shouldFinish = true
		task.start()
		ev.once('run', done)
	})

	it('should execute the task and timeout', function (done) {
		shouldFinish = false
		task.start()
		ev.once('run', function () {
			coordinator.once('timeout', function (_task) {
				task.should.be.equal(_task)
				done()
			})
		})
	})

	it('should acquire lock after timeout', function (done) {
		shouldFinish = true
		task.start()
		coordinator.once('possibleOverrun', function (_task) {
			task.should.be.equal(_task)
			done()
		})
	})

	after(function (done) {
		db.close(done)
	})
})