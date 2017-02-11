/* globals requestAnimationFrame */
const GameClient = require('./GameClient.js')

const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)
const ctx = canvas.getContext('2d')

const gameId = window.location.pathname
const game = new GameClient(gameId)

function mainLoop () {
  requestAnimationFrame(mainLoop)
  game.logic()
  game.render(canvas, ctx)
}
requestAnimationFrame(mainLoop)
