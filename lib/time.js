'use strict'

/**
 * Parse time given as a string, like '2min' or a number in ms.
 * Valid units: 'ms', 's', 'min', 'h', 'd'
 * @param {number|string} time
 * @returns {number} - in ms
 */
module.exports = function (time) {
	if (typeof time === 'number') {
		return checkUint(time)
	} else if (typeof time !== 'string') {
		throw new Error('Invalid time: ' + time)
	}
	var unit = time.match(/(ms|s|min|h|d)$/),
		multiple = 1
	if (unit) {
		time = time.substr(0, time.length - unit[0].length)
		multiple = {
			ms: 1,
			s: 1e3,
			min: 60e3,
			h: 3600e3,
			d: 24 * 3600e3
		}[unit[0]]
	}
	return checkUint(Number(time) * multiple)
}

/**
 * Check if the given number is a safe natural number
 * @param {number} n
 * @returns {number}
 * @throws {Error}
 * @private
 */
function checkUint(n) {
	if (typeof n !== 'number' ||
		!Number.isFinite(n) ||
		n < 0 ||
		n > 2147483647 ||
		Math.round(n) !== n) {
		throw new Error('Invalid timer value, please check if the syntax is correct')
	}

	if (n > 2147483647) {
		// 2^31-1
		throw new Error('Maximum allowed time is 2147483647ms (~25d)')
	}
	return n
}