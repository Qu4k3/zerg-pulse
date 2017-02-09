const randomColor = require('randomcolor')
const {
  ACCEL,
  COIN_RADIUS,
  PLAYER_EDGE
} = require('./constants.js')

class GameServer {
  constructor (io, gameId) {
    this.io = io
    this.roomId = gameId
    this.players = {}
    this.coins = {}
    this.nextCoinId = 0
    this.lastCoinSpawn = Date.now()
    this.lastLogic = Date.now()

    for (let i = 0; i < 10; ++i) {
      const coin = {
        id: this.nextCoinId++,
        x: Math.random() * 500,
        y: Math.random() * 500
      }
      this.coins[coin.id] = coin
    }
  }

  onPlayerConnected (socket) {
    console.log(`${socket.id} connected to game ${this.roomId}`)
    socket.join(this.roomId)

    const inputs = {
      LEFT_ARROW: false,
      RIGHT_ARROW: false,
      UP_ARROW: false,
      DOWN_ARROW: false
    }

    const player = {
      x: Math.random() * 500,
      y: Math.random() * 500,
      vx: 0,
      vy: 0,
      color: randomColor(),
      id: socket.id,
      score: 0,
      inputs
    }
    this.players[socket.id] = player

    socket.emit('world:init', this.players, this.coins, socket.id)

    // so that the new players appears on other people's screen
    this.onPlayerMoved(socket, inputs)
  }

  onPlayerMoved (socket, inputs) {
    console.log(inputs)
    console.log(`${new Date()}: ${socket.id} moved`)
    const player = this.players[socket.id]
    player.timestamp = Date.now()
    player.inputs = inputs
    this.io.to(this.roomId).emit('playerMoved', player)
  }

  onPlayerDisconnected (socket) {
    console.log(`${socket.id} disconnected`)
    delete this.players[socket.id]
    socket.to(this.roomId).broadcast.emit('playerDisconnected', socket.id)
  }

  logic () {
    const now = Date.now()
    const delta = now - this.lastLogic
    this.lastLogic = now

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

      for (let coinId in this.coins) {
        const coin = this.coins[coinId]
        const dist = Math.abs(player.x - coin.x) + Math.abs(player.y - coin.y)
        const radiusSum = COIN_RADIUS + (PLAYER_EDGE / 2)
        if (radiusSum > dist) {
          delete this.coins[coinId]
          player.score++
          this.io.to(this.roomId).emit('coinCollected', player.id, coinId)
        }
      }

      if (Date.now() - this.lastCoinSpawn > 1000) {
        const coin = {
          id: this.nextCoinId++,
          x: Math.random() * 500,
          y: Math.random() * 500
        }
        this.coins[coin.id] = coin
        this.lastCoinSpawn = Date.now()
        this.io.to(this.roomId).emit('coinSpawned', coin)
      }
    }
  }
}

module.exports = GameServer
