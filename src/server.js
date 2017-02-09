// http://socket.io/get-started/chat/
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const path = require('path')
const GameServer = require('./GameServer.js')

/*
// middleware
app.use(function (req, res, next) {
    console.log(arguments)
    next()
})
*/

app.use(express.static('public'))

const games = {}
const gameForPlayer = {} // socket.id => game

app.get('/:gameId', function (req, res) {
  res.sendFile(path.join(__dirname, '/../public/index.html'))
})

io.on('connection', function (socket) {
  socket.on('joinGame', (gameId) => {
    let game = games[gameId]

    if (game == null) {
      game = new GameServer(io, gameId)
      games[gameId] = game
    }

    gameForPlayer[socket.id] = game
    game.onPlayerConnected(socket)
  })

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
    const game = gameForPlayer[socket.id]
    if (game == null) return
    game.onPlayerMoved(socket, inputs)
  })

  socket.on('disconnect', () => {
    const game = gameForPlayer[socket.id]
    if (game == null) return
    game.onPlayerDisconnected(socket)
  })
})

setInterval(function () {
  for (let gameId in games) {
    const game = games[gameId]
    game.logic()
  }
}, 20)

http.listen(process.env.PORT || 3000, function () {
  console.log('listening on *:3000')
})
