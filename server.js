var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var path = require('path');
//var cors = require('cors');

//Passport
var passport = require('passport');
var flash    = require('connect-flash');
var LocalStrategy   = require('passport-local').Strategy;

//Session
var session = require('express-session');
app.use(session({
	secret: 'houseofgamessecret',
	saveUninitialized: true,
	resave: true,
	cookie: {
		path: '/',
		httpOnly: false,
		maxAge: 30*1000 //15 minute Timeout
	}
}));

// app.use(function(req, res, next) {
// 	if(req.headers.origin){
// 		res.header("Access-Control-Allow-Origin", "*");
// 	  	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
// 	  	res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");	
//   		if(req.method==='OPTIONS'){return res.send(200)}
// 	}
	
//   	next();
// });

// app.use(cors());
//app.options('*', cors());

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

//================Database Setup====================//
var pg = require('pg');

const Pool = require('pg-pool');
const url = require('url')
const connectionString = "postgres://nldtjebakdcwid:fd27e6eeeaa90bc9f691d2692d4d1c5632005215ba880f58fa5d0944bdbc428f@ec2-23-21-220-188.compute-1.amazonaws.com:5432/df6jlcpaevc1fe";
const params = url.parse(process.env.DATABASE_URL || connectionString);
const auth = params.auth.split(':');
 
const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true
};
 
const pool = new Pool(config);

// var client = new pg.Client(process.env.DATABASE_URL);
// client.connect();

//Connect to database
// pg.connect(process.env.DATABASE_URL, function(err, result){
// 	if(err){
// 		console.error(err);
// 	}else{
// 		console.log("Connected to heroku Database");
// 	}
// });

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

//=============Passport Session Setup=================//
passport.serializeUser(function(user, done) {
	console.log("USER: " + user)
    done(null, user);
});
passport.deserializeUser(function(user, done) {
	done(null, user);
});

//Passport Login
passport.use('local-login', new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password',
	passReqToCallback : true
}, function(req, username, password, done){
	console.log("Entering login strategy");
	pool.query("SELECT * FROM users WHERE username = $1", [username], function(err, msg, result){
		console.log("Querying for login");
		if(err){
			console.log("Unsuccessfull Login :(");
			return done(err);
		}else{
			return done(null, result.rows[0]);
		}
	});
	//Query for login will be here
	//var user = client.query("SELECT * FROM [] WHERE username = '" + username + "';", callback);
	//brcypt stuff Callback function

}));

//Passport Register/Signup
passport.use('local-signup', new LocalStrategy({
	usernameField : 'username',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
}, function(req, username, password, done){
	process.nextTick(function(){
		//DO queries here?
		console.log("Querying now...");
		pool.query("SELECT * FROM users where uname = $1", [req.body.username], function(err, result){
			// console.log("Querying now...");
				if(err){
					//client.release();
					return done(err);
				}else{
					if(result.rows[0] != undefined){
						// already exists
						console.log("Already exists");
						return done(null, false, request.flash('signupMessage', 'That username is already taken.'));						
					} else {
						var user = {
							username: username,
							password: password
						};

						console.log("Doesn't exist");
						var values = [req.body.fname, req.body.lname, username, req.body.email, req.body.gender, req.body.age, req.body.ethnicity, req.body.password];
						pool.query("INSERT INTO users (fname, lname, uname, email, gender, age, ethnicity, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);", values, function(err, result){
							//client.release();
							if(err){
								return done(err);
							}else{
								console.log("SUCESSFULLY ADDED USER!!");
								
								return done(null, user);
							}
						});
					}
				}
			});

	});
}));

//===================ROUTES===========================//

app.get('/', function(req, res) {
    //res.sendFile(path.join(__dirname + '/public/index.html'));
    // res.render('index.html')
;    res.render('pages/home');
});

app.get('/register', function(req, res){
	//res.setHeader('Cache-Control', 'public, max-age= 3600');
	res.render('pages/register', { message: req.flash('signupMessage') });
});

app.post('/register/auth', passport.authenticate('local-signup', {
        successRedirect : '/pregame', // redirect to the secure profile section
        failureRedirect : '/register', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
}));

app.get('/disclaimer',function(req, res){
	res.render('pages/disclaimer');
});

app.get('/pregame', isLoggedIn, function(req, res){
	res.render('pages/pregame');
});

function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();
    // if they aren't redirect them to the home page
    res.redirect('/');
}

app.get('/gameinfo', function(req, res){
	res.render('pages/gameinfo');
});

app.get('/game', function(req, res){
	res.render('pages/game');
});

app.get('/postgame', isLoggedIn, function(req, res){
	res.render('pages/postgame');
});

app.get('/login', function(req, res){
	res.render('pages/login', { message: req.flash('loginMessage') });
});

app.post('/login/auth', passport.authenticate('local-login', {
    successRedirect : '/pregame', // redirect to the secure profile section
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});


app.listen(port, function(){
	console.log("Listening on port " + port);
});