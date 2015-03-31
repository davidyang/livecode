var React = require('react');
var $ = require('jquery');


var FileListing = React.createClass({
  render: function() {
    return (
      <div>
        {'hello'}
      </div>
    )
  }
});

var Directory = React.createClass({
  render: function() {
    return (
      <div>
        {'hello'}
      </div>
    )
  }
});

var File = React.createClass({
  render: function() {
    return (
      <div>
        {'hello'}
      </div>
    )
  }
});

var FileViewer = React.createClass({
  render: function() {
    return (
      <div>
        world
      </div>
    )
  }
});



var App = React.createClass({
  getInitialState: function() {
    debugger;
    $.getJSON("/jsontest")
    .done(function(data) {
      debugger;
    })
    .fail(function(jqxhr, textStatus, error) {
      debugger;
    });


    return { files: [] };
  },

  // componentWillMount: fun

  render: function() {
    return (
      <div>
        <FileListing />
        <FileViewer currentFile={this.currentFile} />
      </div>
    )
  }  

});

module.exports = App;