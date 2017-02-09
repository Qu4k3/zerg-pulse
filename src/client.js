/* globals requestAnimationFrame, io */
const kbd = require('@dasilvacontin/keyboard')
const deepEqual = require('deep-equal')
const { ACCEL, COIN_RADIUS, PLAYER_EDGE } = require('./constants.js')

const socket = io()

let myPlayerId = null
const myInputs = {
  LEFT_ARROW: false,
  RIGHT_ARROW: false,
  UP_ARROW: false,
  DOWN_ARROW: false
}

class GameClient {
  constructor () {
    this.players = {}
    this.coins = {}
  }

  onWorldInit (serverPlayers, serverCoins) {
    this.players = serverPlayers
    this.coins = serverCoins
  }

  onPlayerMoved (player) {
    console.log(player)
    this.players[player.id] = player

    const delta = (lastLogic + clockDiff) - player.timestamp

        // increment position due to current velocity
        // and update our velocity accordingly
    player.x += player.vx * delta
    player.y += player.vy * delta

    const { inputs } = player
    if (inputs.LEFT_ARROW && !inputs.RIGHT_ARROW) {
      player.x -= ACCEL * Math.pow(delta, 2) / 2
      player.vx -= ACCEL * delta
    } else if (!inputs.LEFT_ARROW && inputs.RIGHT_ARROW) {
      player.x += ACCEL * Math.pow(delta, 2) / 2
      player.vx += ACCEL * delta
    }
    if (inputs.UP_ARROW && !inputs.DOWN_ARROW) {
      player.y -= ACCEL * Math.pow(delta, 2) / 2
      player.vy -= ACCEL * delta
    } else if (!inputs.UP_ARROW && inputs.DOWN_ARROW) {
      player.y += ACCEL * Math.pow(delta, 2) / 2
      player.vy += ACCEL * delta
    }
  }

  onCoinSpawned (coin) {
    this.coins[coin.id] = coin
  }

  onCoinCollected (playerId, coinId) {
    delete this.coins[coinId]
    const player = this.players[playerId]
    player.score++
  }

  onPlayerDisconnected (playerId) {
    delete this.players[playerId]
  }

  logic (delta) {
    const vInc = ACCEL * delta
    for (let playerId in this.players) {
      const player = this.players[playerId]
      const { inputs } = player
      if (inputs.LEFT_ARROW) player.vx -= vInc
      if (inputs.RIGHT_ARROW) player.vx += vInc
      if (inputs.UP_ARROW) player.vy -= vInc
      if (inputs.DOWN_ARROW) player.vy += vInc

      player.x += player.vx * delta
      player.y += player.vy * delta
    }
  }
}
const game = new GameClient()

function updateInputs () {
  const oldInputs = Object.assign({}, myInputs)

  for (let key in myInputs) {
    myInputs[key] = kbd.isKeyDown(kbd[key])
  }

  if (!deepEqual(myInputs, oldInputs)) {
    socket.emit('move', myInputs)

    // update our local player' inputs aproximately when the server
    // takes them into account
    const frozenInputs = Object.assign({}, myInputs)
    setTimeout(function () {
      const myPlayer = game.players[myPlayerId]
      myPlayer.inputs = frozenInputs
    }, ping)
  }
}

const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

const ctx = canvas.getContext('2d')

function gameRenderer (game) {
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)

  // render coins
  for (let coinId in game.coins) {
    const coin = game.coins[coinId]
    ctx.fillStyle = 'yellow'
    ctx.beginPath()
    ctx.arc(coin.x, coin.y, COIN_RADIUS, 0, 2 * Math.PI)
    ctx.fill()
  }

  // render players
  for (let playerId in game.players) {
    const { color, x, y, score } = game.players[playerId]
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = color
    const HALF_EDGE = PLAYER_EDGE / 2
    ctx.fillRect(-HALF_EDGE, -HALF_EDGE, PLAYER_EDGE, PLAYER_EDGE)
    if (playerId === myPlayerId) {
      ctx.strokeRect(-HALF_EDGE, -HALF_EDGE, PLAYER_EDGE, PLAYER_EDGE)
    }

    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.font = '20px Arial'
    ctx.fillText(score, 0, 7)
    ctx.restore()
  }

  // render `ping` and `clockDiff`
  ctx.fillStyle = 'black'
  ctx.textAlign = 'left'
  ctx.font = '20px Arial'
  ctx.fillText(`ping: ${ping}`, 15, 30)
  ctx.fillText(`clockDiff: ${clockDiff}`, 15, 60)
}

let lastLogic = Date.now()
function gameloop () {
  requestAnimationFrame(gameloop)

  const now = Date.now()
  const delta = now - lastLogic
  lastLogic = now

  updateInputs()
  game.logic(delta)
  gameRenderer(game)
}

let lastPingTimestamp
let clockDiff = 0 // how many ms the server is ahead from us
let ping = Infinity

function startPingHandshake () {
  lastPingTimestamp = Date.now()
  socket.emit('game:ping')
}
setInterval(startPingHandshake, 250)

socket.on('connect', function () {
  socket.emit('joinGame', window.location.pathname)
  socket.on('world:init', function (serverPlayers, serverCoins, myId) {
    game.onWorldInit(serverPlayers, serverCoins)
    myPlayerId = myId
  })
  socket.on('playerMoved', game.onPlayerMoved.bind(game))
  socket.on('playerDisconnected', game.onPlayerDisconnected.bind(game))
  socket.on('coinSpawned', game.onCoinSpawned.bind(game))
  socket.on('coinCollected', game.onCoinCollected.bind(game))

  socket.on('game:pong', (serverNow) => {
    ping = (Date.now() - lastPingTimestamp) / 2
    clockDiff = (serverNow + ping) - Date.now()
    console.log({ ping, clockDiff })
  })
})

requestAnimationFrame(gameloop)
