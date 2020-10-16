var http = require('http');
var _url = require('url');
var fs = require('fs');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var express = require('express');
var app = express();
var path = require('path');
var AppDir = path.dirname(require.main.filename);
var session = require('express-session');
var notifier = require('node-notifier');
var shuffle = require('shuffle-array');

app.use(session({
	secret: 'i_am_session_master',
	resave: true,
	saveUninitialized: true
}));

app.get('/', (req, res) => {
	if(!req.session.user) {
		res.sendFile(path.join(AppDir + '\\mainpage.html'));
		} else {
		res.sendFile(path.join(AppDir + '\\mainpage_authenticated.html'));
	}
});

app.get('/logout', (req, res) => {
	res.sendFile(path.join(AppDir + '\\mainpage.html'));
});

app.get('/movie.ico', (req, res) => {
	res.sendFile(path.join(AppDir + '\\movie.ico'));
});

app.get('/loading.gif', (req, res) => {
	res.sendFile(path.join(AppDir + '\\loading.gif'));
});

app.get('/manage', (req, res) => {
	if(!req.session.user) {
		console.log("Unauthorized login.");
		res.writeHead(403);
		res.end();
		} else {
		res.sendFile(path.join(AppDir + '\\manage.html'));
	}
});

app.get('/manage/db', (req, res) => {
	console.log("403 FORBIDDEN.");
	res.writeHead(403);
	res.end();
});

app.get('/db', (req, res) => {
	console.log("403 FORBIDDEN.");
	res.writeHead(403);
	res.end();
});

app.get('/db/all', (req, res) => {
	console.log("403 FORBIDDEN.");
	res.writeHead(403);
	res.end();
});

app.get('/manage/usr', (req, res) => {
	console.log("403 FORBIDDEN.");
	res.writeHead(403);
	res.end();
});

app.get('/manage/destroy', (req, res) => {
	console.log("403 FORBIDDEN.");
	res.writeHead(403);
	res.end();
});

app.get('/signup', (req, res) => {
	res.sendFile(path.join(AppDir + '\\signup.html'));
});

app.get('/angular.js', (req, res) => {
	res.sendFile(path.join(AppDir + '\\angular-1.7.2\\angular.js'));
});

app.get('/success', (req, res) => {
	res.sendFile(path.join(AppDir +  '\\success.html'));
});

app.get('/login', (req, res) => {
	res.sendFile(path.join(AppDir + '\\login.html'));
});

app.listen(4000);

app.post('/manage/usr', function(req, res) {
	console.log("Connected to management page.");
	var msg = req.session.user;
	res.send(msg);
});

var MongoClient = require('mongodb').MongoClient;

MongoClient.connect("mongodb://localhost:27017/movieDatabase", function (err, db) {
    
	app.use(bodyParser.json());
	app.post('/signup', function(req,res){
		console.log("Connection success!");
		var name = req.body.name;
		var surname = req.body.surname;
		var username = req.body.username;
		var password = req.body.password;		
		var authority = "user";
		
		var data = {
			"name": name,
			"surname": surname,
			"username": username, 
			"password" : password,
			"authority" : authority
		}		
		
		res.sendStatus(200);
		var dbo = db.db('movieDatabase');
		dbo.collection('Users').insertOne(data, (err, collection) => {
			console.log("Record inserted successfully!");
			console.log(collection);
			
			
		});
	}); 
	app.post('/login', function(req,res){
		var name = req.body.name;
		var pass = req.body.pass;
		var dbo = db.db('movieDatabase');
		dbo.collection('Users').find({"username": name, "password": pass}).toArray(function(err, result) {
			console.log(result);
			if(result != undefined && result.length != 0) {
				console.log("Okay, this is proper.");
				req.session.user = name;
				req.session.cookie.expires = new Date(Date.now() + 3600000);
				req.session.cookie.maxAge = 3600000;
				var msg = 'valid';
				res.send(msg);
				res.end();
				} else {
				var msg = 'invalid';
				res.send(msg);
			}
		});
		
	}); 
	app.post('/logout', function(req,res){
		console.log(req.session.user + " ends.");
		req.session.destroy();
	});
	app.post('/', function(req,res){
		var msg = req.session.user;
		res.send(msg);
	});
	
	app.post('/db', function(req,res){
		var msg = [];
		var dbo = db.db('movieDatabase');
		dbo.collection('UserWatchlist').find({"user": req.session.user}).toArray(function(err, result) {
			for(i = 0; i < result.length; i++) {
				dbo.collection('Movies').find({"_id": result[i].movieid}).toArray(function(err, result2) {
					msg.push(result2);
				});
				}
		});
		setTimeout(() => {res.send(msg)}, 625);
	});
	
	app.post('/db/all', function(req,res){
		var genres = req.body.genres;
		var year_down = req.body.avgyear - req.body.stdev;
		var year_up = req.body.avgyear + req.body.stdev;
		var msg = [];
		var dbo = db.db('movieDatabase');
		dbo.collection('Movies').find({"genres": genres, "year": {$gt: year_down, $lt: year_up} }).toArray(function(err, result) {
			shuffle(result);
			msg.push(result);
		});
		setTimeout(() => {res.send(msg)}, 625);
	});
	
	
	app.post('/manage', function(req,res){
		var dbo = db.db('movieDatabase');
		var msg = [];
		dbo.collection('UserWatchlist').find({"user": req.session.user}).toArray(function(err, result) {
			loop(result, msg, function(message) {
				res.send(message);
			});
		});
		
		loop = function(array, data, callback) {
			for(i = 0; i < array.length; i++) {
				dbo.collection('Movies').findOne({"_id": array[i].movieid }, function(err, movie) {
					data = data.concat(movie);
					console.log(data);
				});
			}
			
			setTimeout(function() {callback(data)}, array.length * 50);
		}
	});
	
	app.post('/manage/destroy', function(req,res) {
		var name = req.body.moviename;
		var year = parseInt(req.body.year);
		
		var data = { "moviename" : name,
	"year"      : year,	}
	
	var dbo = db.db('movieDatabase');
	dbo.collection('Movies').findOne({"moviename": name, "year": year}, function(err, result) {
		console.log(result);
		var id = result._id;
		setTimeout(function() {
			console.log("Deleting " + id);
			dbo.collection('UserWatchlist').deleteOne({"movieid": id}, (err, result2) => {
				console.log(result2);
				console.log("Deletion success!");
			});
		}, 666);
	});
	});
	
	app.post('/manage/db', function(req,res) {
		var name = req.body.moviename;
		var year = parseInt(req.body.year);
		var director = req.body.director;
		var genres = req.body.genres.split(", ");	
		var poster = req.body.poster
		
		var data = { "moviename" : name,
			"year"      : year,
			"director"  : director,
			"genres"    : genres,
		"poster"   : poster}
		
		//res.sendStatus(200);
		var dbo = db.db('movieDatabase');
		
		
		dbo.collection('Movies').find({"moviename": name, "year": year, "director": director, "genres": genres}).toArray(function(err, result) {
			console.log(result);
			if(result == undefined || result.length == 0) {
				dbo.collection('Movies').insertOne(data, (err, collection) => {
					console.log("Movie record inserted successfully!");
				});		
			}
			setTimeout(function() {dbo.collection('Movies').findOne({"moviename": name, "year": year, "director": director, "genres": genres}, function(err, result2) {
				console.log(result2);
				if(result2 != null) var res2id = result2._id; else res2id = null;
				console.log("Id is: " + res2id);
				var data2 = { "user"  : req.session.user,
					"movieid" : res2id
				}
				dbo.collection('UserWatchlist').findOne({"user": req.session.user, "movieid": res2id}, (err, result3) => {
					console.log("Result on user watchlist: " + result3);
					if(!result3) { 
						dbo.collection('UserWatchlist').insertOne(data2, (err, collection) => {
							var msg = "Valid";
							res.send(msg);
							console.log("Movie inserted to user successfully!");
						});
						} else {
						var msg = "Invalid";
						res.send(msg);
					}
				});
			});
			}, 333);
		});	
	});
	
});      		