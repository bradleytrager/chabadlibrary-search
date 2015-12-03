var fs = require('fs');
var recursive = require('recursive-readdir');
var cheerio = require('cheerio');
var repl = require("repl");
var request = require('request');
var RateLimiter = require('limiter').RateLimiter;
var requestLimiter = new RateLimiter(4, 100);

var files;
var readFileNumber = 0;
var indexFileNumber = 0;
recursive('../data/chabadlibrary.org/books', function(err, files) {
	// process.exit();
	indexFiles(files);
});

function indexFiles(files) {
	console.log('files.length', files.length);
	if (files.length > 0) {
		console.log('numFiles', files.length);
		readAndIndex(files[0], function() {
			files.shift();
			indexFiles(files);
		});
	}
}

function readAndIndex(file, callback) {
	fs.readFile(file, 'utf8', function(err, data) {
		console.log('Read file: ', readFileNumber);
		readFileNumber++;
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
		if (title && content != '<p></p>') {
			var link;
			var regex = /(http:\/\/.+)"/;
			var result = regex.exec($('script').text());
			if (result.length > 1) {
				link = result[1];
			}
			// Throttle requests
			requestLimiter.removeTokens(1, function(err, remainingRequests) {
				// err will only be set if we request more than the maximum number of
				// requests we set in the constructor
				console.log('Indexing file #', indexFileNumber, title);
				indexFileNumber++;

				// remainingRequests tells us how many additional requests could be sent
				// right this moment
				var doc = {
					title: title,
					link: link,
					content: content
				};
				// console.log(doc);
				postDocument(doc);
			});
		}
		callback();
	});
}

function postDocument(data, callback) {
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
		if (callback) {
			callback();
		}
	});
}