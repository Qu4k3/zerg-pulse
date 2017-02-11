const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const path = require('path')
const GameServer = require('./GameServer.js')

app.use(express.static('public'))
app.get('/:gameId', function (req, res) {
  res.sendFile(path.join(__dirname, '/../../public/index.html'))
})

const games = {}
const gameForPlayer = {} // socket.id => game

function onJoinGame (gameId) {
  const socket = this
  let game = games[gameId]

  if (game == null) {
    game = new GameServer(io, gameId)
    games[gameId] = game
  }

  gameForPlayer[socket.id] = game
  game.onPlayerConnected(socket)
}

function onGamePing () {
  const socket = this
  socket.emit('serverPong', Date.now())
}

function onPlayerMove (inputs) {
  const socket = this
  const game = gameForPlayer[socket.id]
  if (game == null) return
  game.onPlayerMoved(socket, inputs)
}

function onDisconnect () {
  const socket = this
  const game = gameForPlayer[socket.id]
  if (game == null) return
  game.onPlayerDisconnected(socket)
}

io.on('connection', function (socket) {
  socket.on('joinGame', onJoinGame)
  socket.on('gamePing', onGamePing)
  socket.on('playerMove', onPlayerMove)
  socket.on('disconnect', onDisconnect)
})

const LOGIC_FREQ = 1000 / 20 // 20 times per second
setInterval(function () {
  for (let gameId in games) {
    const game = games[gameId]
    game.logic()
  }
}, LOGIC_FREQ)

http.listen(process.env.PORT || 3000, function () {
  console.log('listening on *:3000')
})
