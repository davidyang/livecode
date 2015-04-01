var React = require('react');
var $ = require('jquery');
var EventEmitter = require('events').EventEmitter;

var getFilesAtDepth = function(fileArray, depth) {
  return fileArray.filter(function(file) {
    return (file.split("/").length - 1) === depth;
  })
}

var getFoldersAtDepth = function(fileArray, depth) {
  var dirs = [];

  fileArray.forEach(function(file) {
    var path = file.split("/");
    if(path.length > depth+1 && dirs.indexOf(path[depth]) === -1) {
      dirs.push(path[0]);
    }
  });
  return dirs;
};

var getFilesInsideDir = function(files, dir, depth) {
  // var ret = files.filter(function(file) {

          //   return file.split("/")[0] === dir;
          // }).map(function(file) {
          //   return file.split("/").slice(1).join("/");
          // });
          // console.log("inside dir", dir, ret);
          // return ret;
};

var CurrentFiles = new EventEmitter();

CurrentFiles.init = function() {
  var self = this;

  self.files = [];
  self.openFiles = [];
  self.fileData = {};

  $.getJSON("/files")
    .done(function(data) {
      self.files =  data;
      self.emit('loaded');
    })
    .fail(function(jqxhr, textStatus, error) {
      console.log("Error reading files:", error);
    });

  if (window["WebSocket"]) {
    conn = new WebSocket("ws://localhost:8080/ws");
    conn.onclose = function(evt) {
      console.log("Connection closed");
    }
    conn.onmessage = function(evt) {
      var resp = JSON.parse(evt.data);
      self.handleMessage(resp);
      self.emit('updated');
    }
  }
}


CurrentFiles.getFileContents = function(file, callback) {
  var self = this;
  if(self.fileData[file]) {
    callback(self.fileData[file]);
  }

  $.get("/get_file?filename=" + file, function(result) {
    self.fileData[file] = result;
    callback(result);
  });
};

CurrentFiles.setActiveFile = function(file) {
  var self = this;
  this.activeFile = file;
  this.getFileContents(file, function(data) {
    self.emit('activeFileChanged', data);
  });
};
// type UpdateMessage struct {
//   UpdateTime time.Time
//   EventType  string
//   Filename   string
//   Contents   string
// }

CurrentFiles.openFile = function(file) {
  if(this.openFiles.indexOf(file) === -1) {
    this.openFiles.push(file);
    this.emit('tabsUpdated');

  }
  this.setActiveFile(file);
};

CurrentFiles.closeFile = function(file) {
  if(this.openFiles.indexOf(file) > -1) {
    this.openFiles.splice(this.openFiles.indexOf(file), 1);
    this.emit('tabsUpdated');
  }
};

CurrentFiles.handleMessage = function(message) {
  console.log("Got message", message);
  var self = this;
  // debugger;
  if(message.EventType === "update") {
    if(self.files.indexOf(message.Filename) === -1) {
      self.files.push(message.Filename);
    }

    self.fileData[message.Filename] = message.Contents;
    if(self.activeFile === message.Filename) {
      self.emit('activeFileChanged', message.Contents);
    }
  } else if(message.EventType === "remove") {
    if(this.files.indexOf(message.Filename) > -1) {
      this.files.splice(this.files.indexOf(message.Filename), 1);
    }   
  }
  this.emit('filesUpdated', message);
}




var FileListing = React.createClass({
  render: function() {
    return (
      <Directory dir={"/"} files={this.props.files} depth={0} />
    )
  }
});

var Directory = React.createClass({
  getInitialState: function() {
    return {
      allfiles: [],
      files: [],
      dirs: []
    }
  },

  render: function() {
    var files = getFilesAtDepth(this.props.files, this.props.depth);
    var dirs = getFoldersAtDepth(this.props.files, this.props.depth);
    console.log("files, dirs, depth", files, dirs, this.props.depth);


    var self = this;
    return (
      <ul>
        { this.props.depth !== 0 ? <li className="directory">{self.props.dir}</li> : "" }
        {dirs.map(function(dir) {
          return <Directory dir={dir} files={self.props.files} depth={self.props.depth+1} />
        })}
        <ul>
          {files.map(function(file) {
            return <FileList file={file} />
          })}
        </ul> 
      </ul>
    )
  }
});

var FileList = React.createClass({
  handleEvent: function(event) {
    console.log("clicked", this.props.file);
    CurrentFiles.openFile(this.props.file);
  },
  render: function() {
    return (
      <li>
        <a onClick={this.handleEvent}>{this.props.file}</a>
      </li>
    )
  }
});

var FileViewer = React.createClass({
  getInitialState: function() {
    return {
      contents: "",
      files: []
    }
  },
  listFiles: function() {
    this.setState({files: CurrentFiles.openFiles });
  },
  componentDidMount: function() {
    var self = this;
    CurrentFiles.on('tabsUpdated', function() {
      self.listFiles();
    });

    CurrentFiles.on('activeFileChanged', function(contents) {
      self.setState({contents: contents});
    });

  },

  closeFile: function(file) {
    CurrentFiles.closeFile(file);
  },
  setActiveFile: function(file) {
    CurrentFiles.setActiveFile(file);
  },
  render: function() {
    var self = this;
    return (
      <div className="fileViewer">
        <div className="fileTabs">
          {this.state.files.map(function(file) { 
            return <div onClick={self.setActiveFile.bind(self, file)}>{file} 
              <span onClick={self.closeFile.bind(self, file)}>x</span>
            </div>
          })}
        </div>
        <pre className="fileContents">
          {this.state.contents}
        </pre>
      </div>
    )
  }
});

var App = React.createClass({
  getInitialState: function() {
    var self = this;
    return { files: [] };
  },

  componentDidMount: function() {
    var self = this;

    CurrentFiles.init();
    CurrentFiles.on('loaded', function(files) {
      self.setState({files: CurrentFiles.files});
    });

    CurrentFiles.on('filesUpdated', function(filename) {
      self.setState({files: CurrentFiles.files});
    });
  },
  render: function() {
    return (
      <div className="container">
        <FileListing files={this.state.files} />
        <FileViewer />
      </div>
    )
  }  

});

module.exports = App;