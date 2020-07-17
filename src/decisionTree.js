// Using porter to implement scikit-learn model in JS
export function DecisionTreeClassifier() {
  var findMax = function(nums) {
    var index = 0;
    for (var i = 0; i < nums.length; i++) {
      index = nums[i] > nums[index] ? i : index;
    }
    return index;
  };

  this.predict = function(features) {
    var classes = new Array(2);

    if (features[3] <= 0.8956854045391083) {
      classes[0] = 93;
      classes[1] = 0;
    } else {
      classes[0] = 6;
      classes[1] = 43;
    }

    return findMax(classes);
  };
}

if (typeof process !== "undefined" && typeof process.argv !== "undefined") {
  if (process.argv.length - 2 === 12) {
    // Features:
    var features = process.argv.slice(2);

    // Prediction:
    var clf = new DecisionTreeClassifier();
    var prediction = clf.predict(features);
    console.log(prediction);
  }
}
