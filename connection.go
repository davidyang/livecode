package main

import (
	"fmt"
	"github.com/gorilla/websocket"
	"net/http"
)

type Connection struct {
	ws   *websocket.Conn
	send chan []byte

	h *hub
}

func (c *Connection) reader() {
	for {
		_, message, err := c.ws.ReadMessage()
		fmt.Println("Got message:", message, err)
		if err != nil {
			break
		}
		c.h.broadcast <- message
	}
	c.ws.Close()
}

func (c *Connection) writer() {
	//
	for message := range c.send {
		err := c.ws.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			break
		}
	}
	c.ws.Close()
}

var upgrader = &websocket.Upgrader{ReadBufferSize: 1024, WriteBufferSize: 1024}

type wsHandler struct {
	h *hub
}

func (wsh wsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	c := &Connection{send: make(chan []byte, 256), ws: ws, h: wsh.h}
	c.h.register <- c
	defer func() { c.h.unregister <- c }()
	go c.writer()
	c.reader()
}
