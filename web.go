package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/GeertJohan/go.rice"
	"log"
	"net/http"
)

// globals
// Websocket hub
var h *hub

func main() {
	watchedFiles = make(map[string]string)

	h = newHub()
	go h.run()

	SetupWatcher()
	initialWalk(".")

	files := watchedFiles.getFiles()
	fmt.Println("files", files)

	http.HandleFunc("/current.json", func(w http.ResponseWriter, r *http.Request) {
		b, _ := json.Marshal(watchedFiles)
		fmt.Fprintf(w, string(b))
	})

	http.HandleFunc("/get_file", func(w http.ResponseWriter, r *http.Request) {
		log.Print("Got value for name: ", r.FormValue("name"))
		contents, ok := watchedFiles[r.FormValue("filename")]
		if !ok {
			fmt.Fprintf(w, string("Error"))
		}
		fmt.Fprintf(w, string(contents))
	})

	http.HandleFunc("/jsontest", func(w http.ResponseWriter, r *http.Request) {
		data, _ := readFile("web-files/compiled.js")
		b, _ := json.Marshal(map[string]string{"web-files/compiled.js": base64.StdEncoding.EncodeToString([]byte(data))})
		fmt.Fprintf(w, string(b))
	})
	http.Handle("/ws", wsHandler{h: h})
	http.Handle("/", http.FileServer(rice.MustFindBox("web-files").HTTPBox()))
	log.Print("Starting Live Code Server on port 8080")
	http.ListenAndServe(":8080", nil)
}
