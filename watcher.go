package main

import (
	"encoding/json"
	"fmt"
	"gopkg.in/fsnotify.v1"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"time"
)

type UpdateMessage struct {
	UpdateTime time.Time
	EventType  string
	Filename   string
	Contents   string
}

type StringMap map[string]string

var watchedFiles StringMap
var watcher *fsnotify.Watcher
var skipDirs = [...]string{".git", "node_modules", "livecode_logs"}

func (w *StringMap) getFiles() []string {
	var files []string
	files = make([]string, len(*w))

	for key, _ := range *w {
		fmt.Println("here", key)
		files = append(files, key)
	}
	return files
}

func SetupWatcher() {
	var err error
	watcher, err = fsnotify.NewWatcher()
	if err != nil {
		log.Fatal(err)
	}
	// defer watcher.Close()

	go func() {
		for {
			select {
			case event := <-watcher.Events:
				handleEvent(event)
			case err := <-watcher.Errors:
				log.Print("Watcher Error:", err)
			}
		}
	}()
}

// Walk the current
func initialWalk(walkDir string) {
	filepath.Walk(walkDir, func(fp string, fi os.FileInfo, err error) error {
		log.Print("Initial Walk Reading: ", fp)
		if fi.IsDir() {
			log.Print("Is a directory: ", fp)
			if stringInSlice(fp, skipDirs[:]) {
				log.Print("Skipping dir: ", fp)
				return filepath.SkipDir
			}
			log.Print("Adding directory ", fp, " to watch.")
			watcher.Add(fp)
		} else { // assume regular file
			log.Print("Is a file: ", fp)
			watchedFiles[fp], _ = readFile(fp)
		}
		return nil
	})
}

func readFile(fp string) (string, error) {
	log.Print("Reading file: ", fp)
	data, err := ioutil.ReadFile(fp)
	if err != nil {
		log.Fatal("Error reading file", fp)
	}
	return string(data), nil
}

// return "file" or "dir"
func checkFileOrDir(fp string) string {
	fi, _ := os.Stat(fp)
	if fi.Mode().IsDir() {
		return "dir"
	} else {
		return "file"
	}
}

func handleEvent(event fsnotify.Event) {
	log.Print("Got an update event for: ", event.Name, ", type: ", event.Op)
	var eventType string
	var message UpdateMessage

	if event.Op&(fsnotify.Write|fsnotify.Create) > 0 {
		// check if dir or file
		eventType = "update"
		filetype := checkFileOrDir(event.Name)
		if filetype == "file" {
			filedata, _ := readFile(event.Name)
			watchedFiles[event.Name] = filedata
			message = UpdateMessage{time.Now(), eventType, event.Name, filedata}

		} else {
			// add directory to set of watched files
			watcher.Add(event.Name)
			return
		}
	} else if event.Op&(fsnotify.Remove|fsnotify.Rename) > 0 {
		// remove from map
		eventType = "remove"
		message = UpdateMessage{time.Now(), eventType, event.Name, ""}
	} else {
		log.Print("Not one of previous types")
		return
	}

	jsonMessage, err2 := json.Marshal(message)
	if err2 != nil {
		log.Fatal("Got error marshalling", err2)
	}

	h.broadcast <- jsonMessage
}

func stringInSlice(a string, list []string) bool {
	for _, b := range list {
		if b == a {
			return true
		}
	}
	return false
}
