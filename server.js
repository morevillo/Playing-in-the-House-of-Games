var express = require('express');
var app = express();
var port = 8080 || process.env.port;
var path = require('path');

// Database
var pg = require('pg');
var connectionString = "";
//var client = new pg.Client(connectionString || process.env.DATABASE_URL);
//client.connect();

//Middleware
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(bodyParser.json());
var methodOverride = require('method-override');

app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);

app.use('/scripts', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/css', express.static(__dirname + '/public/css'));

app.listen(port, function(){
	console.log("Listening on port " + port);
});

//===================ROUTES===========================/

app.get('/', function(req, res) {
    //res.sendFile(path.join(__dirname + '/public/index.html'));
    res.render('index.html');
});

app.get('/disclaimer',function(req, res){
	res.render('disclaimer.html');
});

app.get('/register', function(req, res){
	res.render('register.html');
});

app.get('/login', function(req, res){
	res.render('login.html');
});

app.get('/pregame', function(req, res){
	res.render('pregame.html');
});

app.get('/postgame', function(req, res){
	res.render('postgame.html');
});

app.get('/gameinfo', function(req, res){
	res.render('gameinfo.html');
});

app.get('/game', function(req, res){
	res.render('game.html');
});