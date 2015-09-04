/*global describe, it, before, after*/
'use strict'

var should = require('should'),
	taskCoordinator = require('../'),
	mongodb = require('mongodb')

describe('Coordinator', function () {
	var runned = false,
		db, coordinator, task

	before(function (done) {
		mongodb.MongoClient.connect('mongodb://localhost:27017/test', function (err, _db) {
			should(err).be.null()
			db = _db
			done()
		})
	})

	it('should instantiate a coordinator', function () {
		coordinator = taskCoordinator(db)
	})

	it('should schedule a task', function () {
		task = coordinator.schedule({
			name: 'my task 2',
			interval: 1e3
		}, function (done) {
			runned = true
			task.stop()
			done()
		})
		task.stop()
	})

	it('should execute the task', function (done) {
		task.start()
		setTimeout(function () {
			runned.should.be.equal(true)
			done()
		}, 1.5e3)
	})

	after(function (done) {
		db.close(done)
	})
})