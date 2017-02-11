const { calculatePlayerAcceleration } = require('../src/common/utils.js')
const { describe, it, beforeEach } = require('mocha')
const { ACCEL } = require('../src/common/constants.js')
const expect = require('unexpected')

describe('utils', function () {
  // before(() => {})
  // beforeEach(() => {})

  describe('calculatePlayerAcceleration', () => {
    let player

    beforeEach(function () {
      player = {
        inputs: {
          LEFT_ARROW: false,
          RIGHT_ARROW: false,
          UP_ARROW: false,
          DOWN_ARROW: false
        }
      }
    })

    it('if pressing right should accel right', function () {
      player.inputs.RIGHT_ARROW = true
      calculatePlayerAcceleration(player)

      const playerAccel = { ax: player.ax, ay: player.ay }
      expect(playerAccel, 'to equal', { ax: ACCEL, ay: 0 })
    })

    it('accel should be zero if no inputs', function () {
      calculatePlayerAcceleration(player)
      const playerAccel = { ax: player.ax, ay: player.ay }
      expect(playerAccel, 'to equal', { ax: 0, ay: 0 })
    })
  })

  // it('...', () => {})

  // afterEach(() => {})
  // after(() => {})
})
