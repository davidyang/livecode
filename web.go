package main

import (
	"encoding/json"
	"fmt"
	"github.com/GeertJohan/go.rice"
	"gopkg.in/fsnotify.v1"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

var h *hub

func main() {
	watchedFiles = make(map[string]string)

	h = newHub()
	go h.run()

	filepath.Walk(".", VisitFile)

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal(err)
		// commment
	}
	defer watcher.Close()

	go func() {
		for {
			select {
			case event := <-watcher.Events:
				handleEvent(event)
			case err := <-watcher.Errors:
				log.Println("error:", err)
			}
		}
	}()

	watcher.Add(".")

	http.HandleFunc("/current.json", func(w http.ResponseWriter, r *http.Request) {
		b, _ := json.Marshal(watchedFiles)
		fmt.Fprintf(w, string(b))
	})
	http.Handle("/ws", wsHandler{h: h})
	http.Handle("/", http.FileServer(rice.MustFindBox("web-files").HTTPBox()))
	http.ListenAndServe(":8080", nil)

}
