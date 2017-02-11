const { ACCEL } = require('./constants.js')

exports.calculatePlayerAcceleration = (player) => {
  const { inputs } = player
  let ax = 0
  let ay = 0
  if (inputs.LEFT_ARROW) ax -= ACCEL
  if (inputs.RIGHT_ARROW) ax += ACCEL
  if (inputs.UP_ARROW) ay -= ACCEL
  if (inputs.DOWN_ARROW) ay += ACCEL

  player.ax = ax
  player.ay = ay
}
