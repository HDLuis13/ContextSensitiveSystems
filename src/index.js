import "bootstrap";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap/dist/css/bootstrap.css";
import "./styles.scss";
import np from "numjs";
import { DecisionTreeClassifier } from "./decisionTree.js";

var vid = document.getElementById("myVideo");

// Saving all events
var evts = [];

// Only used when doing predictions
var prediction = null;

// label
var label = -1;

// video manually paused
var manually_paused = true;

// Get the modal
var modal = document.getElementById("videoModal");

// Get the button that opens the modal
var btn = document.getElementById("showVideo");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// Collect the Motion Events
var addDMotionEvent = function() {
  window.addEventListener("devicemotion", function f(x) {
    if (prediction != null) evts.push(x);
  });
};

// Request Permission for detection of Device Motion for iOS 13+ devices
var requestPermissionForDMotion = function() {
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === "granted") {
          //https://developer.mozilla.org/en-US/docs/Web/API/DeviceOMotionEvent
          addDMotionEvent();
          document.getElementById("request").style.display = "none";
        } else {
          alert("Please provide permission to use this service!");
        }
        console.log(permissionState);
      })
      .catch();
  } else {
    // don't show button for non ios13+ devices
    document.getElementById("request").style.display = "none";
  }
};

// Add Device Motion Event for non ios13+ devices
if (
  window.DeviceMotionEvent &&
  typeof DeviceMotionEvent.requestPermission !== "function"
) {
  document.getElementById("request").style.display = "none";
  addDMotionEvent();
}

// Button for requesting permission
document.getElementById("request").onclick = function() {
  requestPermissionForDMotion();
};

// When toggling prediction, start tracking data and do predictions every x milliseonds
document.getElementById("prediction").onchange = function() {
  if (this.checked) {
    prediction = window.setInterval(predict, 1500);
  } else {
    window.clearInterval(prediction);
    prediction = null; //Schaltet auch die Speicherung ab
    document.getElementById("data").innerHTML = "Prediction stopped";
    document.getElementById("result").innerHTML =
      'Toggle "Predict" to start again';

    evts = [];
  }
};

// When the user clicks on the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
};

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
  vid.pause();
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target === modal) {
    modal.style.display = "none";
    vid.pause();
  }
};

// This is where the magic happens
var predict = function() {
  // When we don't receive events, let the user know
  if (evts.length === 0) {
    document.getElementById("data").innerHTML =
      "Not receiving any motion events";
    document.getElementById("result").innerHTML =
      "Check the sensor permissions!";
  } else {
    // Collect the raw sensor data
    var raw_data = get_raw_data(evts);
    // Convert data for the ml model
    var input_data = generate_input_data(raw_data);
    document.getElementById("data").innerHTML =
      "mean_3d: " + Math.round(input_data[3] * 1000) / 1000;

    // Use the ML model to predict the label (sitting/standing or walking)
    var pred = get_prediction(input_data);

    // "Convert" the encoded label to the real label
    var prev_label = label;
    if (!isNaN(parseFloat(input_data[3])))
      if (pred === 0) label = "Sitting";
      else if (pred === 1) label = "Walking";
    document.getElementById("result").innerHTML = "Label: " + label;

    // Only reacting on a label change if new label is predicted consecutively
    // Stop actions when user manually paused vidoe
    if (modal.style.display !== "none") {
      if (
        prev_label === label &&
        label === "Sitting" &&
        manually_paused === false
      ) {
        vid.play();
        manually_paused = true;
      }
      if (prev_label === label && label === "Walking" && !vid.paused) {
        vid.pause();
        manually_paused = false;
      }
    }
  }

  // Erase all the saved events
  evts = [];
};

var get_raw_data = function(evts) {
  var data = [];
  var evts_data = [];
  if (evts.length > 0) {
    for (var i in evts) {
      var event = evts[i];
      if (event instanceof DeviceMotionEvent) {
        for (var k2 in {
          acceleration: 0
        }) {
          evts_data.push(event[k2]["x"]);
          evts_data.push(event[k2]["y"]);
          evts_data.push(event[k2]["z"]);
        }
      }
      data.push(evts_data);
      evts_data = [];
    }
    return data;
  }
};

var generate_input_data = function(raw_data) {
  var a = np.array(raw_data);
  var x = a.slice(0, [0, 1]);
  var y = a.slice(0, [1, 2]);
  var z = a.slice(0, [2, 3]);

  var three_d = np.sqrt(
    x
      .pow(2)
      .add(y.pow(2))
      .add(z.pow(2))
  );

  var mean_x = np.mean(x);
  var mean_y = np.mean(y);
  var mean_z = np.mean(z);
  var mean_3d = np.mean(three_d);

  var var_x = Math.pow(np.std(x), 2);
  var var_y = Math.pow(np.std(y), 2);
  var var_z = Math.pow(np.std(z), 2);
  var var_3d = Math.pow(np.std(three_d), 2);

  var minmax_x = np.max(x) - np.min(x);
  var minmax_y = np.max(y) - np.min(y);
  var minmax_z = np.max(z) - np.min(z);
  var minmax_3d = np.max(three_d) - np.min(three_d);

  var input_data = [];
  input_data.push(mean_x);
  input_data.push(mean_y);
  input_data.push(mean_z);
  input_data.push(mean_3d);
  input_data.push(var_x);
  input_data.push(var_y);
  input_data.push(var_z);
  input_data.push(var_3d);
  input_data.push(minmax_x);
  input_data.push(minmax_y);
  input_data.push(minmax_z);
  input_data.push(minmax_3d);

  return input_data;
};
var get_prediction = function(input_data) {
  var clf = new DecisionTreeClassifier();
  return clf.predict(input_data);
};
