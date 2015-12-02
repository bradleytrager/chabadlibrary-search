var fs = require('fs');
var recursive = require('recursive-readdir');
var cheerio = require('cheerio');
var repl = require("repl");
var request = require('request');
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 100);

var files;
recursive('../data/chabadlibrary.org/books', function(err, files) {
	// Files is an array of filename 
	// console.log(files.length);
	files.forEach(readAndIndex)
		// readAndIndex(files[0]);
});


function readAndIndex(file) {
	fs.readFile(file, 'utf8', function(err, data) {
		if (err) {
			return console.log(err);
		}
		var $ = cheerio.load(data);
		// var local = repl.start("node::local> ");
		// local.context.$ = $;
		var title = $('title').text();
		var content = '<p>' + $('p.bodytext')
			.toArray()
			.map(function(el) {
				return $(el).text();
			}).filter(function(el) {
				return !!el;
			})
			.join('</p><p>') + '</p>';
		console.log(title);
		if (title && content != '<p></p>'){

			// Throttle requests
			limiter.removeTokens(1, function(err, remainingRequests) {
				// err will only be set if we request more than the maximum number of
				// requests we set in the constructor

				// remainingRequests tells us how many additional requests could be sent
				// right this moment
				postDocument({
					title: title,
					content: content
				});
			});

		}

	});
}


function postDocument(data) {
	request.post({
		"har": {
			"method": "POST",
			"url": "http://localhost:9200/chabadlibrary/book",
			"headers": [{
				"name": "Content-Type",
				"value": "text/plain;charset=UTF-8"
			}],
			"postData": {
				"mimeType": "text/plain;charset=UTF-8",
				"text": JSON.stringify(data)
			}
		}
	}, function(error) {
		if (error) {
			console.log(arguments);
		}
	});
}

// Allow 150 requests per hour (the Twitter search limit). Also understands
// 'second', 'minute', 'day', or a number of milliseconds


// var local = repl.start("node::local> ");

// Exposing the function "mood" to the local REPL's context.
// local.context.$ = $;
//=> <h2 class="title welcome">Hello there!</h2>