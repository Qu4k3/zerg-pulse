// http://socket.io/get-started/chat/
const express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
const randomColor = require('randomcolor')
const {
  ACCEL,
  COIN_RADIUS,
  PLAYER_EDGE
} = require('./constants.js')

/*
// middleware
app.use(function (req, res, next) {
    console.log(arguments)
    next()
})
*/

app.use(express.static('public'))

class GameServer {
  constructor () {
    this.players = {}
    this.coins = {}
    this.nextCoinId = 0
    this.lastCoinSpawn = Date.now()

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
    console.log(`${socket.id} connected`)
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
    io.sockets.emit('playerMoved', player)
  }

  onPlayerDisconnected (socket) {
    console.log(`${socket.id} disconnected`)
    delete this.players[socket.id]
    socket.broadcast.emit('playerDisconnected', socket.id)
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

      for (let coinId in this.coins) {
        const coin = this.coins[coinId]
        const dist = Math.abs(player.x - coin.x) + Math.abs(player.y - coin.y)
        const radiusSum = COIN_RADIUS + (PLAYER_EDGE / 2)
        if (radiusSum > dist) {
          delete this.coins[coinId]
          player.score++
          io.sockets.emit('coinCollected', player.id, coinId)
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
        io.sockets.emit('coinSpawned', coin)
      }
    }
  }
}

io.on('connection', function (socket) {
  game.onPlayerConnected(socket)

  // let lastPongTimestamp
  // let ping = 50
  socket.on('game:ping', () => {
    // lastPongTimestamp = Date.now()
    socket.emit('game:pong', Date.now())
  })
  socket.on('game:pung', () => {
    // ping = (Date.now() - lastPongTimestamp) / 2
  })

  socket.on('move', (inputs) => {
    game.onPlayerMoved(socket, inputs)
  })

  socket.on('disconnect', () => {
    game.onPlayerDisconnected(socket)
  })
})

const game = new GameServer()
let past = Date.now()
setInterval(function () {
  const now = Date.now()
  const delta = now - past
  past = now
  game.logic(delta)
}, 20)

http.listen(process.env.PORT || 3000, function () {
  console.log('listening on *:3000')
})
