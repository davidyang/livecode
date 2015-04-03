var React = require('react');
var $ = require('jquery');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash'); // test


var getFilesInFolder = function(fileArray, folder) {
  var searchPath = folder.split("/");
  return fileArray.filter(function(file) {
    var filePath = file.split("/");
    return searchPath.join("/") == filePath.slice(0, searchPath.length).join('/') && filePath.length == searchPath.length + 1;
  });
}

var getFoldersInFolder = function(fileArray, folder) {
  var searchPath = folder.split("/");
  // first get just fiels
  return _.uniq(fileArray.filter(function(file) {
    var filePath = file.split("/");
    return searchPath.join("/") == filePath.slice(0, searchPath.length).join('/') && filePath.length >= searchPath.length + 2;
  }).map(function(filepath) {
    return filepath.split("/").slice(0, folder.split("/").length+1).join("/");
  }));

};

var getFolderOrFilename = function(fullpath) {
  return _.last(fullpath.split("/"));
};


CurrentFiles = new EventEmitter();

CurrentFiles.init = function() {
  var self = this;
  self.files = {};
  self.openFiles = [];
  $.getJSON("/files")
    .done(function(data) {
      // add a / to all files
      self.files = _.reduce(data, function(result, val, key) {
        result["/" + key] = _.defaults(val,  {LastOpened: new Date()});
        return result;
      }, {});

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
    }
  }
}




// type UpdateMessage struct {
//   UpdateTime time.Time
//   EventType  string
//   Filename   string
//   Contents   string
// }
// 
CurrentFiles.handleMessage = function(message) {
  var self = this;
  message.Filename = "/" + message.Filename;

  if(message.EventType === "update") {
    self.files[message.Filename] = _.defaults(message, self.files[message.Filename]);
  } else if(message.EventType === "remove") {
    delete self.files[message.Filename];
  }
  this.emit('filesUpdated');
}


CurrentFiles.getFiles = function() {
  return Object.keys(this.files).sort()
};

CurrentFiles.getFileObject = function(file) {
  var self = this;
  return self.files[file];
};

CurrentFiles.setActiveFile = function(file) {
  var self = this;
  this.activeFile = file;
  
  this.files[file].LastOpened = new Date();
  // var data = this.getFileObject(file);
  // self.emit('activeFileChanged', data);
  this.emit('filesUpdated');
 
};

CurrentFiles.clearActiveFile = function() {
  this.activeFile = null;
  this.emit('filesUpdated');
};


CurrentFiles.openFile = function(file) {
  if(this.openFiles.indexOf(file) === -1) {
    this.openFiles.push(file);
  }
  this.setActiveFile(file);

};

CurrentFiles.closeFile = function(file) {

  // 1.  the file is open and the current one
  // 2.  the file is open and not the current one
  // 3.  the file is not open (can't happen)
  var currentTab = this.openFiles.indexOf(file);
  if(currentTab > -1) { // it is a current tab
    this.openFiles.splice(this.openFiles.indexOf(file), 1);
    if(this.openFiles.length > 0) {
      CurrentFiles.setActiveFile(this.openFiles[currentTab]);
    } else {
      CurrentFiles.clearActiveFile();
    }
  }

};




var FileListing = React.createClass({
  render: function() {
    return (
      <Directory dir={""} files={this.props.files} depth={0} />
    )
  }
});

var Directory = React.createClass({
  getInitialState: function() {
    return {
      allfiles: [],
      files: [],
      dirs: [],
      open: true
    }
  },

  toggleOpen: function() {
    this.setState({open: !this.state.open});
  },

  render: function() {
    var files = getFilesInFolder(this.props.files, this.props.dir);
    var dirs = getFoldersInFolder(this.props.files, this.props.dir);
    // console.log("files, dirs, depth", files, dirs, this.props.depth);

    function renderFiles() {
      return (
        <div>
          {files.map(function(file) {
            return <File file={file} />
          })}
        </div>
      );
    }


    var self = this;
    return (
      <div  style={{paddingLeft: 20}} >
        <div onClick={this.toggleOpen} className="directory">
          <span className="glyphicon glyphicon-folder-open" aria-hidden="true"></span>{"   "}
           {getFolderOrFilename(self.props.dir) == "" ? "Project" : getFolderOrFilename(self.props.dir)}
        </div>
        { self.state.open ? dirs.map(function(dir) {
          return <Directory dir={dir} files={self.props.files} />
        }) : ""}
        { self.state.open ? renderFiles() : ""}
      </div>

    )
  }
});

var File = React.createClass({
  getInitialState: function() {
    return {};
  },

  updatedSinceView: function() {
    if(CurrentFiles.files[this.props.file].LastOpened < new Date(CurrentFiles.files[this.props.file].UpdateTime)) {
    debugger;
      return true;
    } else {
      return false;
    }
  },

  handleEvent: function(event) {
    console.log("clicked", this.props.file);
    CurrentFiles.openFile(this.props.file);
  },
  render: function() {
    return (
      <div>
        <a  style={{paddingLeft: 20}} onClick={this.handleEvent}>
          <span className="glyphicon glyphicon-file" aria-hidden="true"></span>{" "}
          {getFolderOrFilename(this.props.file)}</a> { this.updatedSinceView() ? <span className="glyphicon glyphicon-refresh" aria-hidden="true"></span>
 : ""}
      </div>
    )
  }
});

var FileViewer = React.createClass({
  getInitialState: function() {
    return {
      CF: { openFiles: [] },
      loaded: false
    }
  },
  listFiles: function() {
    this.setState({files: CurrentFiles.openFiles });
  },

  componentDidMount: function() {
    var self = this;

    CurrentFiles.on('filesUpdated', function(contents) {
      self.setState({CF: CurrentFiles, loaded: true});
    });

    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
  },

  closeFile: function(file) {
    CurrentFiles.closeFile(file);
    return false;
  },
  setActiveFile: function(file) {
    CurrentFiles.setActiveFile(file);
    return false;
  },

  componentDidUpdate: function(prevProps, prevState) {
        var editor = ace.edit("editor");
        if(this.state.CF.activeFile) {
          editor.setValue(this.state.CF.files[this.state.CF.activeFile].Contents,  1);
        }
  },
  render: function() {
    var self = this;
        var divStyle = {
      // width: this.props.width,
      height: 1000
    };
    return (
      <div className="fileViewer">
        <ul className="nav nav-tabs">
          {this.state.CF.openFiles.map(function(file) {
            return <li className={file == self.state.CF.activeFile ? "active": ""} role="presentation" onClick={self.setActiveFile.bind(self, file)}>
              <a>{file.slice(1)}
                <span onClick={self.closeFile.bind(self, file)}> x</span>
              </a>
            </li>
          })}
        </ul>
        <div id="editor" style={divStyle} className="fileContents">
        </div>
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
      self.setState({files: CurrentFiles.getFiles()});
    });

    CurrentFiles.on('filesUpdated', function(filename) {
      self.setState({files: CurrentFiles.getFiles()});
    });
  },
  render: function() {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-3">
            <FileListing files={this.state.files} />
          </div>
          <div className="col-md-8">
            <FileViewer className="col-md-9" />
          </div>
        </div>
      </div>
    )
  }

});

module.exports = App;