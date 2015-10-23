/*globals describe, it*/
'use strict'

var time = require('../lib/time')

describe('time', function () {
	it('should let numbers through', function () {
		time(17).should.be.equal(17)
	})

	it('should parse time string to number', function () {
		time('17ms').should.be.equal(17)
		time('17s').should.be.equal(17e3)
		time('17min').should.be.equal(17 * 60e3)
		time('17h').should.be.equal(17 * 3600e3)
		time('17d').should.be.equal(17 * 24 * 3600e3)
	})

	it('should throw for invalid times', function () {
		var invalid = [undefined, -1, 0.7, 1e40, 'banana', '-1s', '0.1ms', '1e20d']
		invalid.forEach(function (each) {
			function check() {
				time(each)
			}
			check.should.throw()
		})
	})
})