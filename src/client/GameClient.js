const io = require('socket.io-client')
const kbd = require('@dasilvacontin/keyboard')
const deepEqual = require('deep-equal')
const capitalize = require('capitalize')
const { WORLD_X, WORLD_Y } = require('../common/constants.js')
const { calculatePlayerAcceleration } = require('../common/utils.js')

const serverEventsNames = [
  'connect', 'gameInit', 'serverPong',
  'playerMoved', 'playerDisconnected',
  'coinSpawned', 'coinCollected'
]

class GameClient {
  constructor (roomId) {
    this.roomId = roomId
    this.socket = io()

    this.myPlayerId = null
    this.myInputs = {
      LEFT_ARROW: false,
      RIGHT_ARROW: false,
      UP_ARROW: false,
      DOWN_ARROW: false
    }

    this.players = {}
    this.coins = {}

    this.ping = Infinity
    this.clockDiff = 0

    serverEventsNames.forEach((serverEventName) => {
      this.socket.on(
        serverEventName,
        this[`on${capitalize(serverEventName)}`].bind(this)
      )
    })
  }

  pingServer () {
    this.pingMessageTimestamp = Date.now()
    this.socket.emit('gamePing')
  }

  onConnect () {
    this.socket.emit('joinGame', this.roomId)
    this.pingServer()
  }

  onServerPong (serverNow) {
    const now = Date.now()
    this.ping = (now - this.pingMessageTimestamp) / 2
    this.clockDiff = (serverNow + this.ping) - now
    setTimeout(() => {
      this.pingServer()
    }, Math.max(200, this.ping))
  }

  onGameInit (myPlayerId, gameState) {
    this.myPlayerId = myPlayerId
    const { players, coins } = gameState
    this.players = players
    this.coins = coins
  }

  onPlayerMoved (player) {
    this.players[player.id] = player
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

  updateInputs () {
    const { myInputs } = this
    const oldInputs = Object.assign({}, myInputs)

    for (let key in myInputs) {
      myInputs[key] = kbd.isKeyDown(kbd[key])
    }

    if (!deepEqual(myInputs, oldInputs)) {
      this.socket.emit('move', myInputs)

      // update our local player' inputs aproximately when
      // the server takes them into account
      const frozenInputs = Object.assign({}, myInputs)
      setTimeout(() => {
        const myPlayer = this.players[this.myPlayerId]
        myPlayer.inputs = frozenInputs
        calculatePlayerAcceleration(myPlayer)
      }, this.ping)
    }
  }

  logic () {
    const now = Date.now()
    this.updateInputs()

    for (let playerId in this.players) {
      const player = this.players[playerId]
      const { x, y, vx, vy, ax, ay } = player

      const delta = (now + this.clockDiff) - player.timestamp
      const delta2 = Math.pow(delta, 2)

      // dead reckoning
      player.x = x + (vx * delta) + (ax * delta2 / 2)
      player.y = y + (vy * delta) + (ay * delta2 / 2)
      player.vx = vx + (ax * delta)
      player.vy = vy + (ay * delta)
      player.timestamp = now + this.clockDiff
    }
  }

  render (canvas, ctx) {
    ctx.fillStyle = '#778899'
    ctx.fillRect(0, 0, WORLD_X, WORLD_Y)

    // render coins
    for (let coinId in this.coins) {
      const coin = this.coins[coinId]

      // ctx.shadowBlur += 0.25
      // ctx.shadowColor = 'rgba(0,0,0,0.6)'

      var zergling = document.getElementById('zergling')
      ctx.drawImage(zergling, coin.x, coin.y)

      // ctx.fillStyle = 'purple' // blueviolet
      // ctx.beginPath()
      // ctx.arc(coin.x, coin.y, COIN_RADIUS, 0, 2 * Math.PI)
      // ctx.fill()
    }

    // render box
    /* for (let boxId in game.boxs) {
      const box = game.boxs[boxId]
      ctx.fillStyle = 'deepskyblue'
      ctx.beginPath()
      ctx.moveTo(0, 5)
      ctx.lineTo(10, 0)
      ctx.lineTo(20, 5)
      ctx.lineTo(20, 15)
      ctx.lineTo(10, 20)
      ctx.lineTo(0, 15)
      ctx.closePath()
      ctx.fill()
    } */

    // render players
    for (let playerId in this.players) {
      const { x, y, score } = this.players[playerId]
      ctx.save()
      // ctx.translate(x, y)

      // ctx.shadowBlur += 0.25
      // ctx.shadowColor = 'rgba(0,0,0,0.6)'

      /* ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, PLAYER_RADIUS, 0, 2 * Math.PI)
      ctx.fill() */

      var zealot = document.getElementById('zealot')
      ctx.drawImage(zealot, x, y)

      if (playerId === this.myPlayerId) {
        /* ctx.beginPath()
        ctx.arc(x, y, PLAYER_RADIUS, 0, 2 * Math.PI) */
        ctx.drawImage(zealot, x, y)
        ctx.stroke()
      }
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.font = '20px Helvetica'
      ctx.fillText(score, x + 28, y + 67)
      ctx.restore()
    }

    // render `ping` and `clockDiff`
    ctx.fillStyle = '#fff'
    ctx.fillWeight = 'bold'
    ctx.textAlign = 'left'
    ctx.font = '18px Helvetica'
    ctx.fillText(`ping: ${this.ping}`, window.innerWidth - 175, window.innerHeight - 70)
    // ctx.fillText(`clockDiff: ${this.clockDiff}`, window.innerWidth - 175, window.innerHeight - 40)
  }
}

module.exports = GameClient
