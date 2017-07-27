//declare a variable for my categories
var Category = function(id, name) {
    this.catId = id;
    this.catText = name;
};
//Fetch relevant map icons from google

var iconBase = 'https://maps.google.com/mapfiles/kml/shapes/';
var icons = {
    artisan: {
        icon: iconBase + 'man.png'
    }
};


//create the map and the view model
function initMap() {
    var ViewModel = function() {
        var self = this;
        var i;

        //script to display menu in smaller screen
        showNav = function() {
            var items = document.querySelectorAll('#side-bar');
            for (i = 0; i < items.length; i++) {
                if (items[i].className === "top-nav") {
                    items[i].className = "left-nav";
                } else {
                    items[i].className = "top-nav";
                }
            }
        };
        var lat = -1.2886009200028272;
        var lng = 36.822824478149414;
        self.artLocations = ko.observableArray();
        self.markers = ko.observableArray();
        self.categoryTips = ko.observableArray();
        self.selectedItem = ko.observable();
        self.categories = ko.observableArray();


        self.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 16,
            center: new google.maps.LatLng(lat, lng),
            mapTypeId: 'roadmap'
        });
        var infoWindow = new google.maps.InfoWindow();
        // fetch artisan details and locations from the database and store them in array artLocations
        var artAddresses = 'http://52.58.209.142/api/v1/artisan/address';

        fetch(artAddresses)
            .then(function(response) {
                return response.text();
            }).then(function(body) {
                var obj = JSON.parse(body);
                var myAdd = {};
                var addresses = obj.Addresses;
                var l = addresses.length;
                for (i = 0; i < l; i++) {
                    myAdd = {
                        position: {
                            lat: parseFloat(obj.Addresses[i].lat),
                            lng: parseFloat(obj.Addresses[i].lng)
                        },
                        name: obj.Addresses[i].name,
                        skill: obj.Addresses[i].skill,
                        cat: obj.Addresses[i].cat,
                        bio: obj.Addresses[i].bio,
                        id: obj.Addresses[i].id,
                        details: obj.Addresses[i].details,
                        type: 'artisan'
                    };

                    self.artLocations().push(myAdd);

                }

                //get categories from the api result to make array for the select tag
                var my_categories = [];
                var c = obj.Categories.length;
                for (i = 0; i < c; i++) {
                    my_categories.push(new Category(obj.Categories[i].id, obj.Categories[i].name));
                    self.categories(my_categories);
                }

                //register animated marker so as to deactivate on clicking another - elegant solution from stackoverflow @Tomik
                var bouncingMarker = null;


                // Iterate over artisan details and locations and create map markers and store them in markers array
                self.artLocations().forEach(function(feature) {
                    var marker = new google.maps.Marker({
                        position: feature.position,
                        icon: icons[feature.type].icon,
                        title: feature.name,
                        cat: feature.cat,
                        bio: feature.bio,
                        id: feature.id,
                        skill: feature.skill


                    });
                    // include an info window on click for each marker with artisan details and link to respective list item
                    marker.addListener('click', showWindow = function() {
                        marker = this;
                        var content = this.skill + '<br>' + this.bio + '<a href="http://52.58.209.142/show/artisan/' + this.id + '">' + '<br>' + 'Click for More' + '</a>';
                        infoWindow.setContent(content);
                        infoWindow.open(self.map, marker);

                        function animate() {
                            if (bouncingMarker) {
                                bouncingMarker.setAnimation(null);
                            }
                            if (bouncingMarker !== marker) {
                                marker.setAnimation(google.maps.Animation.BOUNCE);
                                bouncingMarker = marker;
                            } else {
                                bouncingMarker = null;
                            }
                        }
                        animate();
                    });
                    self.markers.push(marker);
                });

                // Function to set the map on all markers in the array if it is not empty.
                function displayMarkers(map) {
                    if (self.markers().length > 0) {
                        for (i = 0; i < self.markers().length; i++) {
                            self.markers()[i].setMap(map);
                        }
                    }
                }
                // Function to remove the markers from the map, but keeps them in the array.
                function clearMarkers() {
                    displayMarkers(null);
                }

                //actually display all markers on the map then store them in allMarkers array for when we start manipulating the markers


                displayMarkers(self.map);
                var allMarkers = self.markers();

                //filter the markers depending on the category of artisans selected

                var updatedMarkers = [];

                self.selectedItem.subscribe(function(newCat) {
                    clearMarkers();
                    if (!newCat) {
                        updatedMarkers = allMarkers;
                    } else {
                        for (i = allMarkers.length - 1; i >= 0; i--) {
                            if (allMarkers[i].cat === parseInt(newCat.catId)) {
                                updatedMarkers.push(allMarkers[i]);
                            }
                        }
                    }

                    //display filtered markers by calling calling out observable array with array of filtered markers. Reset updatedMarkers
                    self.markers(updatedMarkers);
                    displayMarkers(self.map);
                    updatedMarkers = [];
                });


            }).catch(function() {

                var pos = {
                    lat: lat,
                    lng: lng
                };
                infoWindow.setMap(self.map);
                infoWindow.setPosition(pos);
                infoWindow.setContent('An error occured, we are unable to retreive Artisan Categories & Locations.');

            });



        self.selectedItem.subscribe(function(newCat) {
            var catText = 'Do it yourself - DIY';
            if (newCat) {
                catText = newCat.catText;
            }
            var nytUrl = 'https://api.nytimes.com/svc/search/v2/articlesearch.json?q=' + catText + '&api-key=440fb4e8ca6a45da863a6e7152f51571';
            var updatedLinks = [];
            var link;


            fetch(nytUrl)
                .then(function(response) {
                    return response.text();
                }).then(function(body) {
                    var obj = JSON.parse(body);
                    var articles = obj.response.docs;
                    var l = articles.length - 4;
                    var headline;
                    var url;
                    for (i = 0; i < l; i++) {
                        headline = articles[i].headline.main;
                        url = articles[i].web_url;
                        link = '<a href="' + url + '">' + headline + '</a>';
                        updatedLinks.push(link);

                    }
                    self.categoryTips(updatedLinks);
                }).catch(function() {
                    link = '<a href="https://www.nytimes.com/">An error occured, we are unable to retrieve NYT tips but you can click here to explore their website</a>';
                    updatedLinks.push(link);
                    self.categoryTips(updatedLinks);
                    updatedLinks = [];
                });
        });

    };
    ko.applyBindings(new ViewModel());
}

function mapError() {
    document.getElementById('maperror').className = "error-show";

}