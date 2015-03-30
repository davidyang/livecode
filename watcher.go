package main

type WatchedFile struct {
	contents string
}

type UpdateMessage struct {
	Filename string
	Contents string
}

var watchedFiles map[string]string

func VisitFile(fp string, fi os.FileInfo, err error) error {
	log.Print("Reading file:", fp)
	data, err := ioutil.ReadFile(fp)
	watchedFiles[fp] = string(data)
	watchedFiles[fp]
	return nil //hello
}

func handleEvent(event fsnotify.Event) {
	log.Print("handling event for", event.Name, event.Op)

	data, err := ioutil.ReadFile(event.Name)
	if err != nil {
		log.Fatal("Got error reading file", err)
	}
	watchedFiles[event.Name] = string(data)
	message := UpdateMessage{event.Name, string(data)}
	log.Print("message", message)
	b, err2 := json.Marshal(message)
	if err2 != nil {
		log.Fatal("Got error marshalling", err2)
	}
	h.broadcast <- b

}
