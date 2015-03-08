angular.module('myApp', [])

.filter('pagination', function(){
  return function(input, start)
  {
    start = +start;
    return input.slice(start);
  };
})

.controller('myCtrl', ['$scope', '$filter', function($scope, $filter){
  
  // amount of data that is to be pulled
  $scope.amount = 200;
  
  $scope.historyItems = [];

  // mode determines if the data coming in historyItems are new
  // 0 - new
  // 1 - old i.e. the data coming from the navigation through pages
  $scope.mode = 0;

  $scope.historyByHostname = {};

  $scope.pageSize = 10;
  $scope.search = {};
  $scope.search.keyword = '';

  $scope.currentPage = 0;
  $scope.paginationRange = [];

  $scope.buildUrlList = function () {
    // To look for history items visited in the last week,
    // subtract a week of microseconds from the current time.
    var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
    var oneWeekAgo = (new Date).getTime() - microsecondsPerWeek;

    chrome.history.search({
      'text': $scope.search.keyword,    // Return every history item....
      'startTime': oneWeekAgo,  // that was accessed less than one week ago.
      'maxResults': $scope.amount + 1 // +1 because we are stripping off the first entry
    },
    function(historyItems) {
      // strip off the first element of the array
      historyItems.shift();

      // Sorting the array in decending order of visitCount
      historyItems.sort(function(obj1, obj2) {
        return obj2.visitCount - obj1.visitCount;
      });

      $scope.historyItems = historyItems;

      // group history by hostname only when the data is new
      if ($scope.mode == 0) {
        $scope.historyDigger();
      }
      
      $scope.numberOfPages = Math.ceil($scope.historyItems.length/$scope.pageSize);

      // relaod the paginations
      $scope.paginationRange = [];
      for (var i = 0; i < $scope.numberOfPages; i++) {
        $scope.paginationRange[i] = i;
      };
      
      $scope.$apply(); // this is important [http://jimhoskins.com/2012/12/17/angularjs-and-apply.html]
    });
  };

  $scope.prevPage = function () {
    // check if current page is the first page
    if ($scope.currentPage <= 0) {
      return;
    }
    $scope.currentPage = $scope.currentPage - 1;
    $scope.mode = 1;
    $scope.buildUrlList();
  }

  $scope.nextPage = function () {
    // check if the current page is the last page
    if ($scope.currentPage >= $scope.numberOfPages - 1) {
      return;
    }
    $scope.currentPage = $scope.currentPage + 1;
    $scope.mode = 1;
    $scope.buildUrlList();
  }

  $scope.setPage = function (page) {
    $scope.currentPage = page;
    $scope.mode = 1;
    $scope.buildUrlList();
  }

  $scope.buildUrlList();

  // capturing the change in the search box
  $scope.$watch('search.keyword', function (newValue, oldValue) {
    if (oldValue != newValue) {
      // set the current page as the first page before newer data gets loaded
      $scope.currentPage = 0;
      $scope.mode = 1;
      $scope.buildUrlList();
    }
  }, true);

  $scope.deleteHistory = function (url) {
    chrome.history.deleteUrl({
        'url': url
      }, function () {
        $scope.mode = 1;
        $scope.buildUrlList();
      }
    );
  }

  // function groups history by the hostname
  $scope.historyDigger = function () {
    var historyNodes = $scope.historyItems;

    for (var i = 0; i < historyNodes.length; i++) {
      // parse the url to find the hostname
      var link = document.createElement('a');
      link.setAttribute('href', historyNodes[i].url);

      var visits = historyNodes[i].visitCount;
      
      // check if hostname already exists in the domain object
      if ($scope.historyByHostname[link.hostname] > 0) {
        $scope.historyByHostname[link.hostname] += visits;
      } else {
        $scope.historyByHostname[link.hostname] = visits;
      }
    };

    $scope.convertToArray($scope.historyByHostname, function (data, max) {

      // d3 color range
      var color = d3.scale.category20();

      // start drawing the chart only after the DOM is ready
      angular.element(document).ready(function () {
        // create graphs using the data
        var chart = d3.select('#chart')
          .append("div").attr("class", "chart")
          .selectAll('div')
          .data(data).enter()
          .append("div")
          .transition().ease("elastic")
          .style("width", function (d) {
            return (d.value/max)*100 + "%";
          })
          .style("background", function (d, i) {
            return color(i);
          })
          .text(function (d) {
            return d.key;
          });
      });

    });
  }

  $scope.convertToArray = function (obj, callback) {

    // used to store the hostname - useful in creating graphs
    var barArray = [];

    // store the maximum value
    var maxVal = 0;

    angular.forEach(obj, function (value, key) {
      if (value > maxVal) {
        maxVal = value;
      }

      barArray.push({'key': key, 'value': value});
    });

    callback(barArray, maxVal);
  }

}]);