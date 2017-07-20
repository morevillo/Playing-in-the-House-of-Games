var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var path = require('path');

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

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

//================Database Setup====================//
var pg = require('pg');

const Pool = require('pg-pool');
const url = require('url')
 
const params = url.parse(process.env.DATABASE_URL);
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
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    pool.query("SELECT * FROM users WHERE id = ($1)", [id], function(err, result){
    	done(err, result.rows[0]);
    });
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
passport.use('local-signup', new LocalStrategy({
	usernameField : 'username',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
}, function(req, username, password, done){
	process.nextTick(function(){
		//DO queries here?
		pool.connect().then((client, err) => {
			if(err){
				client.release();
				return done(err);
			}

			client.query("SELECT * FROM users where uname = ($1)", [req.body.username], function(err, result){
				if(err){
					client.release();
					return done(err);
				}

				if(res.rows.length){
					client.release();
					return done(null, false, req.flash('signupMessage', "Email already has an account"));
				}else{
					var values = [req.body.fname, req.body.lname, req.body.uname, req.body.email, req.body.age, req.body.gender, req.body.ethnicity, req.body.password];
					client.query("INSERT INTO users (fname, lname, uname, email, gender, age, ethnicity, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);", values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7], function(err, result){
						client.release();
						if(err){
							return done(err);
						}
					});
				}
			});
		});
	});
}));

// passport.use('local-register', new LocalStrategy({
// 	usernameField: 'username',
// 	passwordField: 'password',
// 	passReqToCallback : true
// }, function(req, username, password, done){
// 	process.nextTick(function(){
// 		console.log("Registering new user now!");
// 		var user = client.query("SELECT * FROM users WHERE username = '" + username + "';", callback);
// 		function callback(err, res){
// 			if (res.rows[0] != undefined){ //if username already exists
// 				console.log("Username already exists, check if password matches using bcrypt?");
// 			}else{
// 				console.log("Adding new suer to database");
// 				var values = [req.body.fname, req.body.lname, req.body.uname, req.body.email, req.body.age, req.body.gender, req.body.ethnicity, req.body.password]
// 				for (var i = 0; i<values.length; i++) {
// 					console.log("User information " + values[i]);
// 				}
// 				var query = client.query("INSERT INTO users (fname, lname, uname, email, gender, age, ethnicity, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);", values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7]);
// 				req.session.username = username;
// 				req.session.total = 0;
// 				req.session.save();
// 				return done(null, user);
// 			}
// 			return done(null, false);
// 		}
// 	 // 	var values = [req.body.fname, req.body.lname, req.body.uname, req.body.email, req.body.age, req.body.gender, req.body.ethnicity, req.body.password]
// 		// var query = client.query("INSERT INTO users (fname, lname, uname, email, gender, age, ethnicity, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);", values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7]);
// 		// // var user = client.query("SELECT * FROM users WHERE ");
// 		// if(res.rows[0]!=undefined){

// 		// }else{
// 		// 	var query = client.query("INSERT INTO users (fname, lname, uname, email, gender, age, ethnicity, password) VALUES")
// 		// }
// 	});
// }));


//===================ROUTES===========================//

app.get('/', function(req, res) {
    //res.sendFile(path.join(__dirname + '/public/index.html'));
    // res.render('index.html')
;    res.render('pages/home');
});

app.get('/register', function(req, res){
	res.render('pages/register', { message: req.flash('signupMessage') });
});

// app.post('/register', passport.authenticate('local-register', {

// });

// app.post('/register/auth', passport.authenticate('local-register', {
//         successRedirect : '/pregame', // redirect to the secure profile section
//         failureRedirect : '/register', // redirect back to the signup page if there is an error
//         failureFlash : true // allow flash messages
// }));

// app.post('/register/auth', passport.authenticate('local-register', {
//         successRedirect : '/pregame', // redirect to the secure profile section
//         failureRedirect : '/register', // redirect back to the signup page if there is an error
//         failureFlash : true // allow flash messages
// }));

app.post('/register/auth', function (req, res, next){
	passport.authenticate('local-signup', function(err, user, info){
		if(err){
			return next(err);
		}if (user){
			res.send(200);
		}else{
			res.send('Registration unsuccessful');
			return;
		}
	})(req, res, next)
});


app.get('/disclaimer',function(req, res){
	res.render('pages/disclaimer');
});


// app.get('/pregame', function(req, res){
// 	res.render('pages/pregame');
// });

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

app.get('/postgame', function(req, res){
	res.render('pages/postgame');
});

app.get('/login', function(req, res){
	res.render('pages/login', { message: req.flash('loginMessage') });
});

//app.post('/login', function(req, res){

// });

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});


app.listen(port, function(){
	console.log("Listening on port " + port);
});