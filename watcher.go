package main

// comment
import (
	"encoding/json"
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

type fileWatch struct {
	UpdateTime time.Time
	Filename   string
	Contents   string
}

// func (fw *fileWatch) newWatch

type FileWatchMap map[string]*fileWatch

var watchedFiles FileWatchMap
var watcher *fsnotify.Watcher
var skipDirs = [...]string{".git", "node_modules", "livecode_logs"}

func (w *FileWatchMap) getFiles() []string {
	var files []string
	files = make([]string, len(*w))

	i := 0
	for key, _ := range *w {
		files[i] = key
		i++
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
			fileData, _ := readFile(fp)
			watchedFiles[fp] = &fileWatch{time.Now(), fp, fileData}
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

	// log.Print(fp, " was ", len(data))
	if len(data) > 100000 { // file size is > 100k probably not for show
		// log.Print(fp, " was too large at ", len(data))
		return "--- trimmed as too large ---", nil
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

	if event.Op&(fsnotify.Remove|fsnotify.Rename) > 0 {
		// remove from map
		eventType = "remove"
		message = UpdateMessage{time.Now(), eventType, event.Name, ""}
	} else if event.Op&(fsnotify.Write|fsnotify.Create) > 0 {
		// check if dir or file
		eventType = "update"
		filetype := checkFileOrDir(event.Name)
		if filetype == "file" {
			filedata, _ := readFile(event.Name)
			watchedFiles[event.Name] = &fileWatch{time.Now(), event.Name, filedata}
			message = UpdateMessage{time.Now(), eventType, event.Name, filedata}

		} else {
			// add directory to set of watched files
			watcher.Add(event.Name)
			return
		}
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
