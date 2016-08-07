/*global describe, it, before, after*/
'use strict'

var should = require('should'),
	taskCoordinator = require('../'),
	mongodb = require('mongodb'),
	ev = new(require('events').EventEmitter)

describe('Coordinator', function () {
	var shouldFinish = true,
		db, coordinator, task

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
			name: 'my task',
			interval: '0.1s',
			offset: '0.01s',
			timeout: '0.2s'
		}, function (done) {
			task.stop()
			if (shouldFinish) {
				done()
			}
			ev.emit('run')
		})
		task.stop()
	})

	it('should provide the next time the task will run', function () {
		var now = Date.now(),
			next = Math.ceil((now + 1) / 100) * 100 + 10
		task.getNext().should.be.eql(new Date(next))
	})

	it('should execute the task', function (done) {
		shouldFinish = true
		task.start()
		ev.once('run', done)
	})

	it('should skip N executions', function (done) {
		var then = task.getNext().getTime(),
			skip = 10

		task.skip(skip)

		task.start()
		ev.once('run', function () {
			var diff = Date.now() - then
			diff.should.be.approximately(skip * task.interval, task.timeout)
			done()
		})
	})

	it('should backoff exponentially executions', function () {
		task._skipCounter.should.be.equal(0)
		task.backoff()
		task._skipCounter.should.be.equal(1)
		task.backoff(3)
		task._skipCounter.should.be.equal(3)
		task.backoff()
		task._skipCounter.should.be.equal(6)
		task.skip(0)
		task._skipCounter.should.be.equal(0)
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

	it('should not timeout if call task done', function (done) {
		var timeouted = false,
			listener = function () {
				timeouted = true
			}
		shouldFinish = true
		task.start()
		coordinator.on('timeout', listener)
		setTimeout(function () {
			timeouted.should.be.false()
			coordinator.removeListener('timeout', listener)
			done()
		}, 2 * task.timeout)
	})

	after(function (done) {
		db.close(done)
	})
})