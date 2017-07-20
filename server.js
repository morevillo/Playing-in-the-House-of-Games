var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var path = require('path');

//Passport
var passport = require('passport');
var LocalStrategy   = require('passport-local').Strategy;

//Session
var session = require('express-session');
app.use(session({
	secret: 'session secret',
	saveUninitialized: true,
	resave: true,
	cookie: {
		path: '/',
		httpOnly: false,
		maxAge: 30*1000 //15 minute Timeout
	}
}));

app.use(passport.initialize());
app.use(passport.session());

//================Database Setup====================//
var pg = require('pg');
var connectionString = "";
var client = new pg.Client(process.env.DATABASE_URL);
client.connect();

//Connect to database
pg.connect(process.env.DATABASE_URL, function(err, result){
	if(err){
		console.error(err);
	}else{
		console.log("Connected to heroku Database");
	}
});

//====================Middleware========================//
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(bodyParser.json());
var methodOverride = require('method-override');

// app.set('views', __dirname + '/public/views');
app.set('views', __dirname);
app.set('view engine', 'ejs');
// app.engine('html', require('ejs').renderFile);

app.use('/scripts', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/css', express.static(__dirname + '/public/css'));

app.listen(port, function(){
	console.log("Listening on port " + port);
});

//=============Passport Session Setup=================//
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

//Passport Login
passport.use('local-login', new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password',
	passReqToCallback : true
}, function(req, username, password, done){
	//Query for login will be here
	//var user = client.query("SELECT * FROM [] WHERE username = '" + username + "';", callback);
	//brcypt stuff Callback function
}));

//Passport Register/Signup
passport.use('local-register', new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password',
	passReqToCallback : true
}, function(req, username, password, done){
	process.nextTick(function(){
		var user = client.query("SELECT * FROM users WHERE username = '" + username + "';", callback);
		function callback(err, res){
			if (res.rows[0] != undefined){ //if username already exists
				console.log("Username already exists, check if password matches using bcrypt?");
			}else{
				console.log("Adding new suer to database");
				var values = [req.body.fname, req.body.lname, req.body.uname, req.body.email, req.body.age, req.body.gender, req.body.ethnicity, req.body.password]
				for (var i = 0; i<values.length; i++) {
					console.log("User information " + values[i]);
				}
				var query = client.query("INSERT INTO users (fname, lname, uname, email, gender, age, ethnicity, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);", values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7]);
			}
			return done(null, false);
		}
	 // 	var values = [req.body.fname, req.body.lname, req.body.uname, req.body.email, req.body.age, req.body.gender, req.body.ethnicity, req.body.password]
		// var query = client.query("INSERT INTO users (fname, lname, uname, email, gender, age, ethnicity, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);", values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7]);
		// // var user = client.query("SELECT * FROM users WHERE ");
		// if(res.rows[0]!=undefined){

		// }else{
		// 	var query = client.query("INSERT INTO users (fname, lname, uname, email, gender, age, ethnicity, password) VALUES")
		// }
	});
}));


//===================ROUTES===========================//

app.get('/', function(req, res) {
    //res.sendFile(path.join(__dirname + '/public/index.html'));
    // res.render('index.html')
;    res.render('pages/home');
});

app.get('/register', function(req, res){
	res.render('pages/register');
});

// app.post('/register', passport.authenticate('local-register', {

// });

// app.post('/register/auth', passport.authenticate('local-register', {
//         successRedirect : '/pregame', // redirect to the secure profile section
//         failureRedirect : '/register', // redirect back to the signup page if there is an error
//         failureFlash : true // allow flash messages
// }));

app.post('/register/auth', passport.authenticate('local-register', {
        successRedirect : '/pregame', // redirect to the secure profile section
        failureRedirect : '/register', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
}));

app.get('/disclaimer',function(req, res){
	res.render('pages/disclaimer');
});

app.get('/pregame', function(req, res){
	res.render('pages/pregame');
});

app.get('/gameinfo', function(req, res){
	res.render('pages/gameinfo');
});

app.get('/game', function(req, res){
	res.render('pages/game');
});

app.get('/postgame', function(req, res){
	res.render('pages/postgame');
});

app.get('/login', function(req, res){
	res.render('pages/login');
});

//app.post('/login', function(req, res){

// });

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});
