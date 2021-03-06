# Task Coordinator
[![Build Status](https://travis-ci.org/clubedaentrega/task-coordinator.svg?branch=master)](https://travis-ci.org/clubedaentrega/task-coordinator)
[![Inline docs](http://inch-ci.org/github/clubedaentrega/task-coordinator.svg?branch=master)](http://inch-ci.org/github/clubedaentrega/task-coordinator)
[![Dependency Status](https://david-dm.org/clubedaentrega/task-coordinator.svg)](https://david-dm.org/clubedaentrega/task-coordinator)

Schedule a task to run at a fixed interval in at most one of your processes

They will coordinate which one runs each time using a mongodb collection

## Install
`npm install task-coordinator --save`

## Usage
```js
// Create the coordinator using the given mongodb connection
// (mongoose in not necessary, this lib talks directly with the mongodb driver)
var coordinator = require('task-coordinator')(mongoose.connection.db)

// Schedule a task to run every 5s
// Even if you deploy this to many machines/process, only one
// of them will execute the callback
var task = coordinator.schedule({
	name: 'task name',
	interval: '5s' // ms, s, min, h or d
}, function (done) {
	// Do something, them call done()
})
```

## How it works
Each instance tries to insert a document in a collection in mongodb with a unique key in the task name. Only one call will succeed, that one will trigger the callback execution. When the task calls `done()`, that inserted document is removed.

The number of documents in that collection is bounded by the number of tasks scheduled, that is, they do *not* grow indefinitely.

### Synchronization
A task scheduled to run every minute will run at 00:00:00Z, 00:01:00Z, 00:02:00Z and so on. That is, to ensure the execution interval, the tasks are run at whole intervals.

You can set how much each task will offset from whole intervals. A task with interval of 1 minute and offset of 5 seconds will run at 00:00:05Z, 00:01:05Z, 00:02:05Z and so on. By default, the offset is zero.

### Timeout
If, for some reason, the task callback does not call `done()`, the locking mechanism would prevent the task from ever running again. To solve this problem, a lock may timeout after some time.

This approach also creates a problem: if the task is still running when the timeout expires, another task instance may start before the previous one completes. This would then break the assumption of at most one task running.

You can set the desired behaviour with the `timeout` option and monitor violations listening to events `timeout`, `possibleOverrun`.

## Docs
See generated docs on [github](http://clubedaentrega.github.io/task-coordinator)